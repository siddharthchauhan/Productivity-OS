import { describe, it, expect, vi } from 'vitest';

// `componentScores` is pure, but score.ts transitively imports ./db/repo ->
// ./index -> better-sqlite3 + electron, none of which load outside an Electron
// runtime. Stub the repo module so only the pure scoring logic is exercised.
vi.mock('./db/repo', () => ({ eventsInRange: () => [] }));

import { componentScores } from './score';
import type { DayMetrics } from '@shared/types';

function metrics(overrides: Partial<DayMetrics> = {}): DayMetrics {
  return {
    date: '2026-06-02',
    totalActiveMins: 0,
    categories: [],
    hours: [],
    bySource: {},
    deepFocusMins: 0,
    meetingMins: 0,
    commsMins: 0,
    distractMins: 0,
    learningMins: 0,
    contextSwitches: 0,
    ...overrides
  };
}

const value = (m: DayMetrics, id: string) =>
  componentScores(m).find(c => c.id === id)!.value;

describe('componentScores', () => {
  it('returns the five components in order with weights summing to 1', () => {
    const cs = componentScores(metrics());
    expect(cs.map(c => c.id)).toEqual(['focus', 'output', 'leverage', 'comms', 'discipline']);
    expect(cs.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 5);
  });

  it('emits integer values clamped to [0, 100]', () => {
    const cs = componentScores(metrics({
      deepFocusMins: 137,
      commsMins: 53,
      distractMins: 41,
      bySource: {
        cursor: { mins: 95, events: 33 },
        vscode: { mins: 40, events: 9 },
        claudeai: { mins: 22, events: 4 }
      }
    }));
    for (const c of cs) {
      expect(Number.isInteger(c.value)).toBe(true);
      expect(c.value).toBeGreaterThanOrEqual(0);
      expect(c.value).toBeLessThanOrEqual(100);
    }
  });

  describe('focus', () => {
    it('scales deep-focus minutes against the 240m target', () => {
      expect(value(metrics({ deepFocusMins: 120 }), 'focus')).toBe(50);
      expect(value(metrics({ deepFocusMins: 100 }), 'focus')).toBe(42); // 41.67 -> 42
    });
    it('clamps at 100 beyond the target', () => {
      expect(value(metrics({ deepFocusMins: 600 }), 'focus')).toBe(100);
    });
  });

  describe('output', () => {
    // Regression guard: clamp01 must wrap the normalized ratio, not the raw
    // event count. The previous formula `clamp01(events) / target * 100`
    // collapsed every active day to round(1 / 120 * 100) = 1.
    it('normalizes (cursor + vscode) sessions against the 120 target', () => {
      const m = metrics({
        bySource: { cursor: { mins: 120, events: 46 }, vscode: { mins: 40, events: 14 } }
      });
      expect(value(m, 'output')).toBe(50); // (46 + 14) / 120 * 100
      expect(value(m, 'output')).not.toBe(1);
    });
    it('is 0 with no coding sessions', () => {
      expect(value(metrics(), 'output')).toBe(0);
    });
    it('clamps at 100 when sessions exceed the target', () => {
      const m = metrics({ bySource: { cursor: { mins: 300, events: 200 } } });
      expect(value(m, 'output')).toBe(100);
    });
    it('ignores sessions from sources whose time rounds to 0 minutes', () => {
      // A flurry of seconds-long editor focus flickers is not shipped output.
      const m = metrics({ bySource: { cursor: { mins: 0, events: 50 } } });
      expect(value(m, 'output')).toBe(0);
    });
  });

  describe('leverage', () => {
    it('counts Claude.ai + ChatGPT minutes fully and Cursor at half', () => {
      // (0 + 0 + 90 * 0.5) / 90 = 0.5
      expect(value(metrics({ bySource: { cursor: { mins: 90, events: 1 } } }), 'leverage')).toBe(50);
      // (45 + 45 + 0) / 90 = 1
      expect(value(
        metrics({ bySource: { claudeai: { mins: 45, events: 1 }, chatgpt: { mins: 45, events: 1 } } }),
        'leverage'
      )).toBe(100);
    });
  });

  describe('comms', () => {
    // Penalty metrics need exposure: full credit requires >= 2h of tracked
    // active time (see the activity-credit tests below).
    it('rewards a lean inbox against a 180m ceiling', () => {
      expect(value(metrics({ commsMins: 0, totalActiveMins: 300 }), 'comms')).toBe(100);
      expect(value(metrics({ commsMins: 90, totalActiveMins: 300 }), 'comms')).toBe(50);
    });
    it('floors at 0', () => {
      expect(value(metrics({ commsMins: 360, totalActiveMins: 300 }), 'comms')).toBe(0);
    });
  });

  describe('discipline', () => {
    it('penalizes distraction time against a 120m ceiling', () => {
      expect(value(metrics({ distractMins: 0, totalActiveMins: 300 }), 'discipline')).toBe(100);
      expect(value(metrics({ distractMins: 60, totalActiveMins: 300 }), 'discipline')).toBe(50);
    });
    it('floors at 0', () => {
      expect(value(metrics({ distractMins: 240, totalActiveMins: 300 }), 'discipline')).toBe(0);
    });
  });

  describe('activity credit for penalty-based components', () => {
    it('awards no free points on an untracked day (the constant-32 bug)', () => {
      // With zero tracked activity, "no email" and "no distractions" prove
      // nothing — every component must be 0, not a 32-point floor.
      const cs = componentScores(metrics());
      for (const c of cs) expect(c.value).toBe(0);
    });

    it('scales comms and discipline credit with tracked active time', () => {
      // 38m active out of the 120m full-credit ramp -> 100 * 38/120 = 32
      const m = metrics({ totalActiveMins: 38, commsMins: 0, distractMins: 0 });
      expect(value(m, 'comms')).toBe(32);
      expect(value(m, 'discipline')).toBe(32);
    });

    it('reaches full credit at 2h of tracked activity', () => {
      const m = metrics({ totalActiveMins: 120, commsMins: 0, distractMins: 0 });
      expect(value(m, 'comms')).toBe(100);
      expect(value(m, 'discipline')).toBe(100);
    });

    it('does not scale the earned components (focus/output/leverage)', () => {
      // Deep focus is evidence in itself; it must not be dampened on thin days.
      const m = metrics({ totalActiveMins: 30, deepFocusMins: 120 });
      expect(value(m, 'focus')).toBe(50);
    });
  });
});
