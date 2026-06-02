// The improvement loop: for each suggestion that targeted "today", measure the
// actual value of its metric on today's data and mark the outcome.
//
// This is how Pulse knows whether you actually improved based on past advice.

import type { DayMetrics, DayScore, Suggestion, SuggestionTarget } from '@shared/types';
import { listSuggestionsForEvaluation, setSuggestionOutcome } from '../db/repo';

export function evaluateSuggestions(
  date: string,
  metrics: DayMetrics,
  score: DayScore
): Array<{ id: number; outcome: NonNullable<Suggestion['outcome']>; actual: number; target: number }> {
  const open = listSuggestionsForEvaluation(date);
  const results: Array<{ id: number; outcome: NonNullable<Suggestion['outcome']>; actual: number; target: number }> = [];

  for (const s of open) {
    const actual = readMetric(s.target, metrics, score);
    if (actual == null) continue;
    const outcome = grade(s.target, actual);
    if (s.id == null) continue;
    setSuggestionOutcome(s.id, outcome, { actual, target: s.target.value }, date);
    results.push({ id: s.id, outcome, actual, target: s.target.value });
  }
  return results;
}

// Maps a target.metric name to the actual value on a given day.
function readMetric(t: SuggestionTarget, m: DayMetrics, s: DayScore): number | null {
  switch (t.metric) {
    case 'distract_mins':  return m.distractMins;
    case 'deep_focus_mins': return m.deepFocusMins;
    case 'meeting_mins':   return m.meetingMins;
    case 'comms_mins':     return m.commsMins;
    case 'context_switches': return m.contextSwitches;
    case 'score_value':    return s.value;
    case 'first_block_start_hour':
      // earliest hour with focus >= 50
      for (const h of m.hours) if (h.focus >= 50) return h.hour;
      return null;
    default: return null;
  }
}

function grade(t: SuggestionTarget, actual: number): 'followed' | 'partial' | 'not_followed' {
  // Strict: met the target as stated.
  if (cmp(actual, t.op, t.value)) return 'followed';
  // Partial: within 20% of the target on the right side of the gap.
  const slack = Math.abs(t.value) * 0.20;
  switch (t.op) {
    case '<=': case '<':  return actual <= t.value + slack ? 'partial' : 'not_followed';
    case '>=': case '>':  return actual >= t.value - slack ? 'partial' : 'not_followed';
    case '==':            return Math.abs(actual - t.value) <= slack ? 'partial' : 'not_followed';
  }
}

function cmp(a: number, op: SuggestionTarget['op'], b: number): boolean {
  switch (op) {
    case '<=': return a <= b;
    case '>=': return a >= b;
    case '<':  return a < b;
    case '>':  return a > b;
    case '==': return a === b;
  }
}
