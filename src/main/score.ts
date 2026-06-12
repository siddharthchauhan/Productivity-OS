// Pulse productivity score — the headline 0..100 number on Today.
//
// The score is a weighted sum of five components, each itself 0..100.
// Component formulas are intentionally simple and inspectable; tune them in
// `componentScores()` once you've watched the app track you for a few days.

import type { DayMetrics, DayScore, ScoreComponent } from '@shared/types';
import { eventsInRange } from './db/repo';

// Default weights (sum to 1.0). Mirrors the design data exactly.
const WEIGHTS: Record<ScoreComponent['id'], number> = {
  focus:      0.26,
  output:     0.24,
  leverage:   0.18,
  comms:      0.16,
  discipline: 0.16
};

// Targets — "what 100 looks like" for each metric. Adjust to your typical day.
// I deliberately picked round numbers, not user-specific calibrations; the
// monthly trend will tell you whether to nudge these.
const TARGETS = {
  deepFocusMins: 240,           // 4 hours of uninterrupted focus = max
  outputEvents: 120,            // ~commits + code-editor sessions
  aiLeverageMins: 90,           // time in AI tools, capped
  unansweredCommsCount: 0,      // ideal inbox-zero
  distractMins: 120             // 0 = max discipline; >=120m = floor
};

// Comms hygiene and focus discipline are penalty metrics: they start at 100
// and only lose points. Without exposure time that's meaningless — an
// untracked day would earn perfect marks for "no email" and "no distractions",
// flooring every empty day's score at a constant 32. Scale their credit by
// tracked active time instead; full credit after 2 hours.
const CREDIT_FULL_MINS = 120;

export function dayScore(
  date: string,
  metrics: DayMetrics,
  yesterdayScore?: DayScore | null,
  weekAvg = 0
): DayScore {
  const components = componentScores(metrics);
  const value = Math.round(
    components.reduce((sum, c) => sum + c.value * c.weight, 0)
  );

  const band = bandFor(value);
  const delta = yesterdayScore ? value - yesterdayScore.value : 0;

  // Diff each component against yesterday for the dashboard delta pills
  if (yesterdayScore) {
    const byId = new Map(yesterdayScore.components.map(c => [c.id, c]));
    for (const c of components) {
      const prev = byId.get(c.id);
      if (prev) c.delta = c.value - prev.value;
    }
  }

  return { date, value, band, delta, weekAvg, components };
}

export function componentScores(m: DayMetrics): ScoreComponent[] {
  const credit = clamp01(m.totalActiveMins / CREDIT_FULL_MINS);
  const items: ScoreComponent[] = [
    {
      id: 'focus',
      label: 'Deep focus',
      weight: WEIGHTS.focus,
      value: clamp01(m.deepFocusMins / TARGETS.deepFocusMins) * 100,
      delta: 0,
      detail: `${fmtMins(m.deepFocusMins)} of uninterrupted focus`,
      icon: 'timer'
    },
    {
      id: 'output',
      label: 'Output shipped',
      weight: WEIGHTS.output,
      // baseline proxy until we wire git/GitHub: deep-work events count.
      // Sources whose total time rounds to 0 minutes contribute no events —
      // a burst of seconds-long focus flickers isn't shipped output.
      value: clamp01(
        (editorEvents(m, 'vscode') + editorEvents(m, 'cursor'))
        / TARGETS.outputEvents
      ) * 100,
      delta: 0,
      detail: `${(m.bySource['cursor']?.events ?? 0)} Cursor sessions · ${(m.bySource['vscode']?.events ?? 0)} VS Code sessions`,
      icon: 'gitBranch'
    },
    {
      id: 'leverage',
      label: 'AI leverage',
      weight: WEIGHTS.leverage,
      value: clamp01(
        ((m.bySource['claudeai']?.mins ?? 0) + (m.bySource['chatgpt']?.mins ?? 0)
          + (m.bySource['cursor']?.mins ?? 0) * 0.5)   // Cursor is half-AI by assumption
        / TARGETS.aiLeverageMins
      ) * 100,
      delta: 0,
      detail: 'Time spent leveraging AI tools',
      icon: 'sparkle'
    },
    {
      id: 'comms',
      label: 'Comms hygiene',
      weight: WEIGHTS.comms,
      // baseline: penalise excessive comms time. A future version will use
      // actual unread counts via Gmail / Outlook integrations.
      value: clamp01(1 - m.commsMins / 180) * 100 * credit,
      delta: 0,
      detail: `${fmtMins(m.commsMins)} on email + chat`,
      icon: 'mail'
    },
    {
      id: 'discipline',
      label: 'Focus discipline',
      weight: WEIGHTS.discipline,
      value: clamp01(1 - m.distractMins / TARGETS.distractMins) * 100 * credit,
      delta: 0,
      detail: `${fmtMins(m.distractMins)} on distractions${m.learningMins ? ` · ${fmtMins(m.learningMins)} reclassified as learning` : ''}`,
      icon: 'shield'
    }
  ];
  return items.map(c => ({ ...c, value: Math.round(c.value) }));
}

function bandFor(v: number): string {
  if (v >= 85) return 'Excellent day';
  if (v >= 70) return 'Strong day';
  if (v >= 55) return 'Solid day';
  if (v >= 40) return 'Mixed day';
  if (v >= 20) return 'Recovery day';
  return 'Off day';
}

function editorEvents(m: DayMetrics, id: string): number {
  const s = m.bySource[id];
  return s && s.mins > 0 ? s.events : 0;
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function fmtMins(m: number) {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Used by monthly aggregator
export function weekAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Used internally for cheap event-count queries
export function eventsForDay(date: string) {
  const [start, end] = dayBounds(date);
  return eventsInRange(start, end);
}

export function dayBounds(date: string): [number, number] {
  // Treat date as local YYYY-MM-DD; bound from local 00:00 to next 00:00.
  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();
  return [start, end];
}
