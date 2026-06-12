// Monthly rollup: aggregates daily scores, computes improvement rate from
// suggestion outcomes, and asks the model for a narrative.

import type { DailyReport, MonthlyReport } from '@shared/types';
import { localDateStr } from '@shared/dates';
import { client, getModel, hasApiKey } from './client';
import { listReportsBetween, saveMonthlyReport, improvementRate } from '../db/repo';
import { ymOf } from '../metrics';

export async function generateMonthlyReport(ym: string): Promise<MonthlyReport> {
  const [start, end] = monthBounds(ym);
  const reports = listReportsBetween(start, end);
  if (reports.length === 0) {
    return emptyMonthly(ym);
  }

  const scores = reports.map(r => r.score.value);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const sorted = [...reports].sort((a, b) => b.score.value - a.score.value);
  const bestDay = { date: sorted[0].date, score: sorted[0].score.value };
  const worstDay = { date: sorted[sorted.length - 1].date, score: sorted[sorted.length - 1].score.value };

  const rate = improvementRateForRange(start, end);
  const body = await narrative(ym, reports, avgScore, rate);

  const report: MonthlyReport = {
    ym,
    avgScore,
    bestDay,
    worstDay,
    improvementRate: rate.rate,
    followedCount: rate.followed,
    totalSuggestions: rate.total,
    body,
    generatedAt: Date.now()
  };
  saveMonthlyReport(report);
  return report;
}

function improvementRateForRange(start: string, end: string) {
  // Reuse the global helper but with a generous window
  const daysSpan = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400_000) + 1;
  return improvementRate(daysSpan);
}

async function narrative(
  ym: string,
  reports: DailyReport[],
  avg: number,
  rate: { followed: number; total: number; rate: number }
): Promise<string> {
  if (!hasApiKey()) {
    return `Average score this month: ${avg}/100 across ${reports.length} days. You followed ${rate.followed} of ${rate.total} AI suggestions (${Math.round(rate.rate * 100)}%).`;
  }
  try {
    const summary = reports.map(r => ({
      date: r.date,
      score: r.score.value,
      deepFocus: r.time.deepFocusMins,
      meetings: r.time.meetingMins,
      distract: r.time.distractMins
    }));
    const c = client();
    const resp = await c.messages.create({
      model: getModel(),
      max_tokens: 900,
      system: SYSTEM,
      messages: [{ role: 'user', content: USER(ym, summary, rate) }]
    });
    const text = (resp.content[0] as { type: string; text?: string })?.text ?? '';
    return text.trim();
  } catch (err) {
    console.warn('[monthly] AI narrative failed, returning baseline:', err);
    return `Average score this month: ${avg}/100 across ${reports.length} days. You followed ${rate.followed} of ${rate.total} AI suggestions (${Math.round(rate.rate * 100)}%).`;
  }
}

const SYSTEM = `You are Pulse, writing a brief month-in-review for one engineer.

Tone: analyst, second person, no hype. 3 short paragraphs:
  1) Overall trajectory (avg score, momentum)
  2) What got better vs worse (specific numbers from data)
  3) What to focus on next month (1–2 concrete habits)

≤ 220 words total. No headers, no bullet lists, no emoji.`;

const USER = (ym: string, days: object, rate: object) => `Month: ${ym}

Daily snapshot:
${JSON.stringify(days, null, 2)}

Suggestion adherence:
${JSON.stringify(rate, null, 2)}

Write the narrative.`;

function emptyMonthly(ym: string): MonthlyReport {
  return {
    ym, avgScore: 0,
    bestDay: { date: '', score: 0 },
    worstDay: { date: '', score: 0 },
    improvementRate: 0, followedCount: 0, totalSuggestions: 0,
    body: 'No data yet for this month.',
    generatedAt: Date.now()
  };
}

function monthBounds(ym: string): [string, string] {
  const [y, m] = ym.split('-').map(Number);
  const start = `${ym}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${ym}-${String(lastDay).padStart(2, '0')}`;
  return [start, end];
}

export function currentYm(): string { return ymOf(localDateStr()); }
