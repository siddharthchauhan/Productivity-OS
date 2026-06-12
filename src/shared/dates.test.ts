import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { localDateStr, addDays } from './dates';

// Node re-reads process.env.TZ on each Date operation, so we can pin the test
// to a timezone west of Greenwich regardless of the machine running it.
const ORIGINAL_TZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/New_York'; });
afterAll(() => { process.env.TZ = ORIGINAL_TZ; });

describe('localDateStr', () => {
  it('uses the local calendar day, not the UTC one (the frozen-score bug)', () => {
    // 23:43 EDT on June 11 === 03:43 UTC on June 12. toISOString() says
    // "2026-06-12"; the local day — the one the user is living in — is the 11th.
    const lateEvening = new Date(Date.UTC(2026, 5, 12, 3, 43, 0));
    expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-06-12');
    expect(localDateStr(lateEvening)).toBe('2026-06-11');
  });

  it('matches the UTC date when local time is mid-day', () => {
    const noon = new Date(Date.UTC(2026, 5, 11, 16, 0, 0)); // noon EDT
    expect(localDateStr(noon)).toBe('2026-06-11');
  });

  it('zero-pads month and day', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('moves forward and backward across month boundaries', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-06-01', -1)).toBe('2026-05-31');
  });

  it('crosses year boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('is stable across DST transitions (stays a calendar-day operation)', () => {
    // US DST started 2026-03-08; the 23-hour day must still count as one day.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02'); // 25-hour fall-back day
  });

  it('handles multi-day jumps', () => {
    expect(addDays('2026-06-11', -7)).toBe('2026-06-04');
  });
});
