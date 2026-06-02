import { describe, it, expect, vi } from 'vitest';

// metrics.ts -> ./score & ./db/repo -> ./index -> better-sqlite3 + electron,
// none of which load outside an Electron runtime. eventsInRange is the only
// repo function reached; stub it so metricsForDay reads controlled events.
const { eventsInRange } = vi.hoisted(() => ({ eventsInRange: vi.fn() }));
vi.mock('./db/repo', () => ({ eventsInRange }));

import { metricsForDay, computeDeepFocus } from './metrics';
import type { ActivityEvent, Category } from '@shared/types';

const Y = 2026, MO = 5, D = 2; // June 2, 2026 — month is 0-indexed
const DATE = '2026-06-02';     // dayBounds(DATE) === local midnight of the above
const at = (h: number, m = 0) => new Date(Y, MO, D, h, m, 0, 0).getTime();

function event(
  startH: number,
  startM: number,
  durMin: number,
  opts: { app?: string; category: Category; sourceId?: string; idle?: boolean; durationMs?: number }
): ActivityEvent {
  const ts = at(startH, startM);
  return {
    ts,
    endTs: ts + durMin * 60_000,
    app: opts.app ?? 'App',
    category: opts.category,
    sourceId: opts.sourceId,
    idle: opts.idle ?? false,
    durationMs: opts.durationMs ?? durMin * 60_000
  };
}

const deep = (h: number, m: number, dur: number) =>
  event(h, m, dur, { app: 'Cursor', category: 'deepwork', sourceId: 'cursor' });

describe('computeDeepFocus', () => {
  it('returns 0 with no events', () => {
    expect(computeDeepFocus([])).toBe(0);
  });

  it('returns 0 when no events are deep work', () => {
    expect(computeDeepFocus([
      event(9, 0, 30, { category: 'comms', sourceId: 'slack' }),
      event(10, 0, 20, { category: 'meetings', sourceId: 'zoom' })
    ])).toBe(0);
  });

  it('counts a single deep-work block', () => {
    expect(computeDeepFocus([deep(9, 0, 60)])).toBe(60);
  });

  it('merges blocks separated by less than 5 minutes', () => {
    // 9:00-9:30, 3-min gap, 9:33-10:00 -> one run 9:00-10:00 = 60 (57 if split)
    expect(computeDeepFocus([deep(9, 0, 30), deep(9, 33, 27)])).toBe(60);
  });

  it('treats an exactly-5-minute gap as continuous (inclusive boundary)', () => {
    // e.ts - prevEnd === 5min, the condition is `<=`
    expect(computeDeepFocus([deep(9, 0, 30), deep(9, 35, 25)])).toBe(60); // 55 if split
  });

  it('splits blocks separated by more than 5 minutes', () => {
    // 9:00-9:30, 6-min gap, 9:36-10:00 -> two runs 30 + 24 = 54 (60 if merged)
    expect(computeDeepFocus([deep(9, 0, 30), deep(9, 36, 24)])).toBe(54);
  });

  it('keeps a run alive across a short non-deep interruption', () => {
    // deep, then 3-min comms (ignored), then deep resuming within 5 min -> merged 60
    expect(computeDeepFocus([
      deep(9, 0, 30),
      event(9, 30, 3, { category: 'comms', sourceId: 'slack' }),
      deep(9, 33, 27)
    ])).toBe(60);
  });

  it('breaks a run across a long non-deep interruption', () => {
    // deep, then 20-min meeting, then deep -> two runs 30 + 30 = 60 (not merged 80)
    expect(computeDeepFocus([
      deep(9, 0, 30),
      event(9, 30, 20, { category: 'meetings', sourceId: 'zoom' }),
      deep(9, 50, 30)
    ])).toBe(60);
  });
});

describe('metricsForDay', () => {
  it('returns an empty-but-valid shape when there are no events', () => {
    eventsInRange.mockReturnValue([]);
    const m = metricsForDay(DATE);
    expect(m.totalActiveMins).toBe(0);
    expect(m.categories).toEqual([]);
    expect(m.bySource).toEqual({});
    expect(m.deepFocusMins).toBe(0);
    expect(m.workStart).toBeUndefined();
    expect(m.hours).toHaveLength(11); // 8a..6p inclusive
  });

  it('excludes idle events from every aggregate', () => {
    eventsInRange.mockReturnValue([
      deep(9, 0, 30),
      event(9, 30, 60, { app: 'Idle', category: 'other', sourceId: 'spotify', idle: true })
    ]);
    const m = metricsForDay(DATE);
    expect(m.totalActiveMins).toBe(30);
    expect(m.bySource).toEqual({ cursor: { mins: 30, events: 1 } });
  });

  it('skips events that round to 0 minutes (under ~30s)', () => {
    eventsInRange.mockReturnValue([
      event(9, 0, 0, { app: 'Cursor', category: 'deepwork', sourceId: 'cursor', durationMs: 40_000 }), // 40s -> 1m
      event(9, 1, 0, { app: 'Slack', category: 'comms', sourceId: 'slack', durationMs: 20_000 })        // 20s -> 0m, dropped
    ]);
    const m = metricsForDay(DATE);
    expect(m.totalActiveMins).toBe(1);
    expect(m.bySource).toEqual({ cursor: { mins: 1, events: 1 } });
  });

  it('aggregates categories, sources, totals, context switches and the work window', () => {
    eventsInRange.mockReturnValue([
      event(9, 0, 30, { app: 'Cursor', category: 'deepwork', sourceId: 'cursor' }),
      event(9, 30, 15, { app: 'Slack', category: 'comms', sourceId: 'slack' }),
      event(9, 45, 30, { app: 'Cursor', category: 'deepwork', sourceId: 'cursor' }),
      event(10, 15, 20, { app: 'zoom.us', category: 'meetings', sourceId: 'zoom' })
    ]);
    const m = metricsForDay(DATE);
    expect(m.totalActiveMins).toBe(95);
    expect(m.categories.map(c => c.id)).toEqual(['deepwork', 'meetings', 'comms']);
    expect(m.categories.map(c => c.mins)).toEqual([60, 20, 15]);
    expect(m.bySource).toEqual({
      cursor: { mins: 60, events: 2 },
      slack: { mins: 15, events: 1 },
      zoom: { mins: 20, events: 1 }
    });
    expect(m.meetingMins).toBe(20);
    expect(m.commsMins).toBe(15);
    expect(m.deepFocusMins).toBe(60); // two deep blocks split by 15-min comms -> 30 + 30
    expect(m.contextSwitches).toBe(3);
    expect(m.workStart).toBe('9:00 AM');
    expect(m.workEnd).toBe('10:35 AM');
  });

  it('computes hourly focus intensity and meeting flags', () => {
    eventsInRange.mockReturnValue([
      event(9, 0, 60, { app: 'Cursor', category: 'deepwork', sourceId: 'cursor' }), // fills the 9a bucket
      event(13, 0, 30, { app: 'Code', category: 'deepwork', sourceId: 'vscode' }),  // half the 1p bucket
      event(11, 0, 30, { app: 'zoom.us', category: 'meetings', sourceId: 'zoom' })  // meeting in the 11a bucket
    ]);
    const m = metricsForDay(DATE);
    const hour = (h: number) => m.hours.find(x => x.hour === h)!;
    expect(hour(9).focus).toBe(100); // 60/60
    expect(hour(13).focus).toBe(50); // 30/60
    expect(hour(8).focus).toBe(0);
    expect(hour(11).meeting).toBe(true);
    expect(hour(9).meeting).toBe(false);
  });
});
