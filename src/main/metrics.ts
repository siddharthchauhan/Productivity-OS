// Day-level metrics derived from the raw events table. Pure functions; no I/O
// other than reading events through repo.

import type { ActivityEvent, Category, DayMetrics, HourBucket, TimeSlice } from '@shared/types';
import { localDateStr } from '@shared/dates';
import { dayBounds } from './score';
import { eventsInRange } from './db/repo';

const CATEGORY_LABELS: Record<Category, string> = {
  deepwork: 'Deep work / coding',
  meetings: 'Meetings',
  comms:    'Email & chat',
  reviews:  'Code review',
  planning: 'Planning / docs',
  distract: 'Distractions',
  learning: 'Learning',
  context:  'Context switching',
  other:    'Other'
};

const CATEGORY_COLORS: Record<Category, string> = {
  deepwork: 'var(--accent)',
  meetings: '#7A5AE0',
  comms:    '#2A6FDB',
  reviews:  '#1F8A5B',
  planning: '#E0922A',
  distract: 'rgba(217,83,79,0.75)',
  learning: '#11A37F',
  context:  'rgba(120,110,100,0.6)',
  other:    'rgba(120,110,100,0.35)'
};

export function metricsForDay(date: string): DayMetrics {
  const [start, end] = dayBounds(date);
  const events = eventsInRange(start, end)
    .filter(e => !e.idle)
    .map(e => clipToWindow(e, start, end))
    .filter(e => e.durationMs > 0);
  return buildMetrics(date, events, start);
}

// An event that spans midnight is returned by eventsInRange for BOTH days, so
// only the portion inside the window may count toward this day's totals —
// otherwise a 11 PM–2 AM session is double-counted in full on each day.
function clipToWindow(e: ActivityEvent, start: number, end: number): ActivityEvent {
  const ts = Math.max(e.ts, start);
  const endTs = Math.min(e.endTs, end);
  if (ts === e.ts && endTs === e.endTs) return e;
  return { ...e, ts, endTs, durationMs: Math.max(0, endTs - ts) };
}

function buildMetrics(date: string, events: ActivityEvent[], dayStart: number): DayMetrics {
  // ---- per-category & per-source aggregation ----
  // Accumulate raw milliseconds and round once per aggregate at the end.
  // Rounding per event silently discards everything under ~30s — and short
  // events are the common case (window-title churn splits focus into slivers),
  // so per-event rounding made most real activity vanish from the day.
  const byCat = new Map<Category, number>();
  const bySource = new Map<string, { ms: number; events: number }>();
  let workStart: number | undefined;
  let workEnd: number | undefined;
  let totalActiveMs = 0;
  let lastApp: string | undefined;
  let contextSwitches = 0;

  for (const e of events) {
    if (e.durationMs <= 0) continue;
    totalActiveMs += e.durationMs;
    workStart = workStart === undefined ? e.ts : Math.min(workStart, e.ts);
    workEnd = workEnd === undefined ? e.endTs : Math.max(workEnd, e.endTs);

    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.durationMs);
    if (e.sourceId) {
      const cur = bySource.get(e.sourceId) ?? { ms: 0, events: 0 };
      bySource.set(e.sourceId, { ms: cur.ms + e.durationMs, events: cur.events + 1 });
    }
    if (lastApp && lastApp !== e.app) contextSwitches += 1;
    lastApp = e.app;
  }
  const toMins = (ms: number) => Math.round(ms / 60000);

  // ---- hourly intensity strip (workday 8a..7p) ----
  const hours: HourBucket[] = [];
  for (let h = 8; h <= 18; h++) {
    const hStart = dayStart + h * 3600_000;
    const hEnd = hStart + 3600_000;
    let focusMins = 0;
    let meeting = false;
    for (const e of events) {
      const overlap = Math.max(0, Math.min(hEnd, e.endTs) - Math.max(hStart, e.ts));
      if (overlap <= 0) continue;
      const m = overlap / 60000;
      if (e.category === 'deepwork') focusMins += m;
      if (e.category === 'meetings') meeting = true;
    }
    hours.push({
      hour: h,
      label: h <= 12 ? `${h === 12 ? 12 : h}${h < 12 ? 'a' : 'p'}` : `${h - 12}p`,
      focus: Math.round(Math.min(60, focusMins) / 60 * 100),
      meeting
    });
  }

  // ---- pie slices ordered to match the design ----
  const order: Category[] = ['deepwork', 'meetings', 'comms', 'reviews', 'distract', 'planning', 'context', 'learning', 'other'];
  const categories: TimeSlice[] = order
    .map(id => ({
      id,
      label: CATEGORY_LABELS[id],
      mins: toMins(byCat.get(id) ?? 0),
      color: CATEGORY_COLORS[id]
    }))
    .filter(s => s.mins > 0);

  // ---- deep-focus = the longest contiguous run of deepwork minutes ----
  const deepFocusMins = computeDeepFocus(events);

  return {
    date,
    workStart: workStart ? hourLabel(workStart) : undefined,
    workEnd: workEnd ? hourLabel(workEnd) : undefined,
    totalActiveMins: toMins(totalActiveMs),
    categories,
    hours,
    bySource: Object.fromEntries(
      [...bySource].map(([id, v]) => [id, { mins: toMins(v.ms), events: v.events }])
    ),
    deepFocusMins,
    meetingMins: toMins(byCat.get('meetings') ?? 0),
    commsMins: toMins(byCat.get('comms') ?? 0),
    distractMins: toMins(byCat.get('distract') ?? 0),
    learningMins: toMins(byCat.get('learning') ?? 0),
    contextSwitches
  };
}

export function computeDeepFocus(events: ActivityEvent[]): number {
  // sum minutes inside deep-work runs broken by < 5m of comms/distract/etc.
  // Accumulate ms and round once so sub-minute runs don't vanish.
  let totalMs = 0;
  let runStart: number | undefined;
  let runEnd: number | undefined;
  const ALLOW_BREAK_MS = 5 * 60_000;
  for (const e of events) {
    const isDeep = e.category === 'deepwork';
    if (isDeep) {
      if (runStart === undefined) { runStart = e.ts; runEnd = e.endTs; }
      else if (e.ts - (runEnd ?? e.ts) <= ALLOW_BREAK_MS) { runEnd = e.endTs; }
      else {
        totalMs += (runEnd ?? e.ts) - runStart;
        runStart = e.ts; runEnd = e.endTs;
      }
    }
  }
  if (runStart !== undefined && runEnd !== undefined) {
    totalMs += runEnd - runStart;
  }
  return Math.round(totalMs / 60000);
}

function hourLabel(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? 'AM' : 'PM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

// Empty metrics shape so the UI never crashes on a fresh install.
export function emptyMetrics(date: string): DayMetrics {
  return {
    date,
    totalActiveMins: 0,
    categories: [],
    hours: Array.from({ length: 11 }, (_, i) => ({
      hour: 8 + i,
      label: i + 8 <= 12 ? `${i + 8 === 12 ? 12 : i + 8}a` : `${i + 8 - 12}p`,
      focus: 0,
      meeting: false
    })),
    bySource: {},
    deepFocusMins: 0,
    meetingMins: 0,
    commsMins: 0,
    distractMins: 0,
    learningMins: 0,
    contextSwitches: 0
  };
}

export function todayDate(): string {
  return localDateStr();
}

export function ymOf(date: string): string {
  return date.slice(0, 7);
}
