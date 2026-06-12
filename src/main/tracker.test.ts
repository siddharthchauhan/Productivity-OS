import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActivityEvent } from '@shared/types';

// tracker.ts -> electron (powerMonitor), active-win (native), ./db/repo
// (better-sqlite3 via ./classifier too) — none load under plain Node. Stub all
// three so ticks run against controlled window observations and fake timers.
const { insertEvent, getClassification, activeWindow, sysIdle } = vi.hoisted(() => ({
  insertEvent: vi.fn(),
  getClassification: vi.fn(),
  activeWindow: vi.fn(),
  sysIdle: { secs: 0 }
}));

vi.mock('./db/repo', () => ({ insertEvent, getClassification }));
vi.mock('electron', () => ({ powerMonitor: { getSystemIdleTime: () => sysIdle.secs } }));
vi.mock('active-win', () => ({ default: activeWindow }));

import { startTracker, stopTracker } from './tracker';

const win = (app: string, title: string) => ({ title, owner: { name: app } });
const POLL = 5_000;
const inserted = (): ActivityEvent[] => insertEvent.mock.calls.map(c => c[0]);

beforeEach(() => {
  vi.useFakeTimers();
  insertEvent.mockClear();
  getClassification.mockReturnValue(null); // no user overrides
  sysIdle.secs = 0;
});

afterEach(() => {
  stopTracker();
  vi.useRealTimers();
});

describe('tracker event splitting', () => {
  it('does NOT split on cosmetic title changes (terminal spinner churn)', async () => {
    // Warp animates a spinner glyph in its title every few seconds. All ticks
    // classify identically (deepwork), so this must stay ONE event.
    activeWindow.mockResolvedValue(win('Warp', '⠂ Claude Code'));
    await startTracker();
    for (const title of ['⠐ Claude Code', '⠂ Claude Code', '⠸ build running']) {
      activeWindow.mockResolvedValue(win('Warp', title));
      await vi.advanceTimersByTimeAsync(POLL);
    }
    expect(insertEvent).not.toHaveBeenCalled(); // single event still open

    stopTracker(); // closes the open event at t0 + 15s
    expect(inserted()).toHaveLength(1);
    expect(inserted()[0]).toMatchObject({
      app: 'Warp',
      category: 'deepwork',
      idle: false,
      durationMs: 3 * POLL
    });
    expect(inserted()[0].title).toBe('⠸ build running'); // freshest title kept
  });

  it('splits when the foreground app changes', async () => {
    activeWindow.mockResolvedValue(win('Warp', 'zsh'));
    await startTracker();
    activeWindow.mockResolvedValue(win('Slack', '#general'));
    await vi.advanceTimersByTimeAsync(POLL);

    expect(inserted()).toHaveLength(1);
    expect(inserted()[0]).toMatchObject({ app: 'Warp', category: 'deepwork', durationMs: POLL });
  });

  it('splits when the classification changes within the same app (browser tabs)', async () => {
    activeWindow.mockResolvedValue(win('Google Chrome', 'pulse PR #9 — github.com'));
    await startTracker();
    await vi.advanceTimersByTimeAsync(POLL); // same tab, extends
    activeWindow.mockResolvedValue(win('Google Chrome', 'cat videos — youtube.com'));
    await vi.advanceTimersByTimeAsync(POLL);

    expect(inserted()).toHaveLength(1);
    expect(inserted()[0]).toMatchObject({
      app: 'Google Chrome',
      category: 'deepwork',
      sourceId: 'github',
      durationMs: 2 * POLL
    });

    activeWindow.mockResolvedValue(win('Slack', '#general'));
    await vi.advanceTimersByTimeAsync(POLL);
    expect(inserted()).toHaveLength(2);
    expect(inserted()[1]).toMatchObject({ category: 'distract', sourceId: 'youtube', durationMs: POLL });
  });

  it('splits when the idle state flips', async () => {
    activeWindow.mockResolvedValue(win('Warp', 'zsh'));
    await startTracker();
    await vi.advanceTimersByTimeAsync(POLL);
    sysIdle.secs = 120; // past the 90s idle threshold
    await vi.advanceTimersByTimeAsync(POLL);

    expect(inserted()).toHaveLength(1);
    expect(inserted()[0]).toMatchObject({ idle: false, durationMs: 2 * POLL });
  });

  it('drops sub-2-second blips entirely', async () => {
    activeWindow.mockResolvedValue(win('Warp', 'zsh'));
    await startTracker();
    stopTracker(); // closed immediately — 0ms duration
    expect(insertEvent).not.toHaveBeenCalled();
  });
});
