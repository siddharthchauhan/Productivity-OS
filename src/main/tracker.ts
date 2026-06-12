// macOS foreground-window tracker.
//
// Polls active-win every POLL_MS. Whenever the foreground app, its
// classification (category + source), or the idle state changes, we close the
// previous event and open a new one. Title changes alone do NOT split events:
// terminals and browsers rewrite their titles constantly (Warp animates a
// spinner glyph every few seconds), and splitting on title turned an hour of
// focus into hundreds of 5-second slivers.
//
// This is intentionally event-driven, not sample-driven: 1 minute of Slack +
// 1 minute of Cursor produces 2 rows, not 24 (at a 5s poll). That makes the
// queries downstream a lot cheaper and the data way more readable.

import { powerMonitor } from 'electron';
import { insertEvent } from './db/repo';
import { classify } from './classifier';
import type { ActivityEvent, Category } from '@shared/types';

const POLL_MS = 5_000;
const IDLE_THRESHOLD_S = 90; // counted as idle after 90s of no input

interface OpenEvent {
  ts: number;
  app: string;
  title?: string;
  idle: boolean;
  category: Category;
  sourceId?: string;
}

let timer: NodeJS.Timeout | null = null;
let running = false;
let openEvent: OpenEvent | null = null;
let captureTitles = true;
let eventCount24h = 0;
let last24hRollAt = Date.now();

export function trackerRunning() { return running; }
export function trackerStatus() {
  return {
    running,
    lastEventTs: openEvent?.ts,
    currentApp: openEvent?.app,
    currentTitle: openEvent?.title,
    eventCount24h
  };
}

export function setCaptureTitles(v: boolean) { captureTitles = v; }

export async function startTracker(options?: { captureTitles?: boolean }) {
  if (running) return;
  if (typeof options?.captureTitles === 'boolean') captureTitles = options.captureTitles;
  running = true;
  await tick();
  timer = setInterval(tick, POLL_MS);
}

export function stopTracker() {
  if (!running) return;
  running = false;
  if (timer) clearInterval(timer);
  timer = null;
  closeOpenEvent(Date.now());
}

async function tick() {
  try {
    const now = Date.now();
    rollEventCount(now);

    // active-win is an ESM-only module; import dynamically so the bundler
    // doesn't try to inline it as CommonJS.
    const { default: activeWindow } = await import('active-win');
    const win = await activeWindow().catch(() => null);

    const idleSecs = powerMonitor.getSystemIdleTime();
    const isIdle = idleSecs >= IDLE_THRESHOLD_S;

    if (!win) {
      // No foreground window (lock screen, login window). Close any open event.
      closeOpenEvent(now);
      return;
    }

    const app = win.owner?.name ?? 'unknown';
    const title = captureTitles ? (win.title || undefined) : undefined;
    const { category, sourceId } = classify(app, title);

    if (
      openEvent &&
      openEvent.app === app &&
      openEvent.category === category &&
      openEvent.sourceId === sourceId &&
      openEvent.idle === isIdle
    ) {
      // Same focus — extend. Keep the freshest title for the stored row, but a
      // title change alone (spinner glyphs, tab retitles within the same
      // classification) never splits the event.
      if (title !== undefined) openEvent.title = title;
      return;
    }

    closeOpenEvent(now);
    openEvent = { ts: now, app, title, idle: isIdle, category, sourceId };
  } catch (err) {
    // We deliberately swallow errors so a single poll glitch never kills the loop.
    console.warn('[tracker] tick failed:', err);
  }
}

function closeOpenEvent(endTs: number) {
  if (!openEvent) return;
  const durationMs = endTs - openEvent.ts;
  if (durationMs < 2_000) { openEvent = null; return; } // ignore <2s blips
  const evt: ActivityEvent = {
    ts: openEvent.ts,
    endTs,
    app: openEvent.app,
    title: openEvent.title,
    category: openEvent.category,
    sourceId: openEvent.sourceId,
    idle: openEvent.idle,
    durationMs
  };
  insertEvent(evt);
  eventCount24h += 1;
  openEvent = null;
}

function rollEventCount(now: number) {
  if (now - last24hRollAt > 60_000) {
    last24hRollAt = now;
    // We don't decrement precisely — the renderer asks for an exact count via
    // repo.eventCountSince(now - 24h) when it cares.
  }
}
