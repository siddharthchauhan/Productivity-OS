// Generates the end-of-day report.
//
// The prompt is structured to keep the model honest:
//   • we always pass measured numbers (today + 7-day avg) so it can't hallucinate
//   • we ask for JSON with a strict schema so the renderer can render directly
//   • observations and suggestions are separate fields — suggestions must include
//     a structured `target` so we can evaluate adherence tomorrow.

import type { DailyReport, DayMetrics, DayScore, Observation, Suggestion } from '@shared/types';
import { localDateStr, addDays } from '@shared/dates';
import { client, getModel } from './client';
import { saveDailyReport, saveSuggestion, listReportsBetween } from '../db/repo';

interface AIPayload {
  headline: string;
  observations: Observation[];
  // suggestions arrive without `date` — we tag them with tomorrow's date before persisting
  suggestions: Array<Omit<Suggestion, 'id' | 'status' | 'createdAt' | 'date'>>;
}

export async function generateDailyReport(
  date: string,
  metrics: DayMetrics,
  score: DayScore,
  yesterday: DayMetrics | null,
  weekHistory: DayScore[]
): Promise<DailyReport> {
  const promptCtx = buildPromptContext(date, metrics, score, yesterday, weekHistory);
  let ai: AIPayload;
  try {
    ai = await callModel(promptCtx);
  } catch (err) {
    console.warn('[daily-report] AI call failed, falling back to deterministic report:', err);
    ai = deterministicFallback(metrics, score, yesterday);
  }

  const tomorrow = isoNextDay(date);

  // Persist suggestions, tagged to tomorrow so the evaluator picks them up.
  const persistedSuggestions: Suggestion[] = ai.suggestions.map(s => {
    const sug: Omit<Suggestion, 'id'> = {
      ...s,
      date: tomorrow,
      status: 'open',
      createdAt: Date.now()
    };
    const id = saveSuggestion(sug);
    return { ...sug, id };
  });

  const report: DailyReport = {
    date,
    score,
    time: metrics,
    headline: ai.headline,
    observations: ai.observations,
    suggestions: persistedSuggestions,
    generatedAt: Date.now(),
    model: getModel()
  };
  saveDailyReport(report);
  return report;
}

// ---- prompt + parsing ----

function buildPromptContext(
  date: string,
  m: DayMetrics,
  s: DayScore,
  yMetrics: DayMetrics | null,
  history: DayScore[]
) {
  const avg = history.length
    ? Math.round(history.reduce((a, b) => a + b.value, 0) / history.length)
    : s.value;

  return {
    date,
    score: { value: s.value, band: s.band, components: s.components },
    today: {
      activeMins: m.totalActiveMins,
      deepFocusMins: m.deepFocusMins,
      meetingMins: m.meetingMins,
      commsMins: m.commsMins,
      distractMins: m.distractMins,
      learningMins: m.learningMins,
      contextSwitches: m.contextSwitches,
      categories: m.categories,
      hours: m.hours,
      bySource: m.bySource
    },
    yesterday: yMetrics ? {
      deepFocusMins: yMetrics.deepFocusMins,
      meetingMins: yMetrics.meetingMins,
      commsMins: yMetrics.commsMins,
      distractMins: yMetrics.distractMins
    } : null,
    sevenDayAvgScore: avg
  };
}

async function callModel(ctx: object): Promise<AIPayload> {
  const c = client();
  const resp = await c.messages.create({
    model: getModel(),
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT(ctx) }]
  });

  const text = (resp.content[0] as { type: string; text?: string })?.text ?? '';
  return extractJSON<AIPayload>(text);
}

const SYSTEM_PROMPT = `You are Pulse, an analyst that writes daily productivity reports for one engineer.

Tone: data-first, minimal opinion, second person ("you"). No emoji, no hype, no pep talk.
Every observation must be grounded in the supplied numbers — never invent metrics.
Every suggestion must include a measurable target so adherence can be auto-evaluated tomorrow.

Reply with ONE JSON object, no prose around it, matching this TypeScript shape exactly:

interface Output {
  headline: string;                            // one sentence, ≤ 110 chars
  observations: Array<{
    metric: string;                            // e.g. "Deep focus"
    value: string;                             // e.g. "3h 40m"
    vs: string;                                // e.g. "+58m vs 7-day avg" — use supplied numbers
    dir: 'up' | 'down' | 'flat';
    note: string;                              // ≤ 220 chars
  }>;
  suggestions: Array<{
    title: string;                             // imperative, ≤ 70 chars
    detail: string;                            // ≤ 280 chars
    impact: 'High' | 'Medium' | 'Low';
    target: {
      metric: 'distract_mins' | 'deep_focus_mins' | 'meeting_mins' | 'comms_mins' | 'score_value' | 'first_block_start_hour' | 'context_switches';
      op: '<=' | '>=' | '==' | '<' | '>';
      value: number;
      window?: 'all_day' | 'morning' | 'afternoon';
    };
  }>;
}

Constraints:
- 4–7 observations, ordered by significance.
- Exactly 3 suggestions, ordered by impact.
- Targets must be specific numbers, not ranges. Hours-of-day are 0..23.`;

const USER_PROMPT = (ctx: object) => `Generate today's Pulse report from this data:

${JSON.stringify(ctx, null, 2)}

Output JSON only.`;

function extractJSON<T>(text: string): T {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON in model output');
  return JSON.parse(text.slice(start, end + 1)) as T;
}

// ---- fallback when there's no key or the API errors ----

function deterministicFallback(m: DayMetrics, s: DayScore, y: DayMetrics | null): AIPayload {
  const delta = y ? m.deepFocusMins - y.deepFocusMins : 0;
  const dir = (n: number): 'up' | 'down' | 'flat' => n > 5 ? 'up' : n < -5 ? 'down' : 'flat';
  return {
    headline: `Score ${s.value}/100 (${s.band.toLowerCase()}). ${fmt(m.deepFocusMins)} deep focus, ${fmt(m.distractMins)} on distractions.`,
    observations: [
      { metric: 'Deep focus', value: fmt(m.deepFocusMins), vs: y ? `${signed(delta)}m vs yesterday` : 'no prior day', dir: dir(delta),
        note: `Largest focus block detected. Total active time ${fmt(m.totalActiveMins)}.` },
      { metric: 'Meetings', value: fmt(m.meetingMins), vs: y ? `${signed(m.meetingMins - y.meetingMins)}m vs yesterday` : '',
        dir: dir(-(m.meetingMins - (y?.meetingMins ?? m.meetingMins))),
        note: 'Time spent in meeting apps.' },
      { metric: 'Distractions', value: fmt(m.distractMins), vs: '', dir: 'flat',
        note: `${fmt(m.distractMins)} on distraction apps · ${fmt(m.learningMins)} reclassified as learning.` }
    ],
    suggestions: [
      { title: 'Hit 3h deep focus tomorrow', detail: 'Block a 2-hour morning slot in your calendar and silence Slack notifications during it.',
        impact: 'High', target: { metric: 'deep_focus_mins', op: '>=', value: 180 } },
      { title: 'Keep distractions under an hour', detail: 'Set a 60-minute distraction budget for tomorrow — Pulse will flag when you cross it.',
        impact: 'High', target: { metric: 'distract_mins', op: '<=', value: 60 } },
      { title: 'Reduce context switching', detail: 'Aim for fewer than 40 app switches by batching comms checks.',
        impact: 'Medium', target: { metric: 'context_switches', op: '<=', value: 40 } }
    ]
  };
}

function fmt(m: number) { return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }
function signed(n: number) { return n >= 0 ? `+${n}` : `${n}`; }

function isoNextDay(d: string): string {
  return addDays(d, 1);
}

export function recentReports(days: number) {
  const end = localDateStr();
  return listReportsBetween(addDays(end, -days), end);
}
