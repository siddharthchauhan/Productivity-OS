// Daily + monthly schedulers. Uses node-cron in main process.

import cron from 'node-cron';
import { generateDailyReport } from './ai/daily-report';
import { evaluateSuggestions } from './ai/improvement';
import { generateMonthlyReport, currentYm } from './ai/monthly';
import { addDays } from '@shared/dates';
import { metricsForDay, todayDate, ymOf } from './metrics';
import { dayScore, eventsForDay } from './score';
import { getDailyReport } from './db/repo';

let dailyTask: cron.ScheduledTask | null = null;
let monthlyTask: cron.ScheduledTask | null = null;

const DEFAULT_DAILY_CRON = process.env.PULSE_DAILY_CRON ?? '30 18 * * *'; // 6:30 PM every day
const MONTHLY_CRON = '0 9 1 * *'; // 9:00 AM on day 1 of every month

export function startSchedulers() {
  scheduleDaily(DEFAULT_DAILY_CRON);
  scheduleMonthly();
}

export function scheduleDaily(expression: string) {
  if (dailyTask) dailyTask.stop();
  if (!cron.validate(expression)) {
    console.warn('[scheduler] invalid cron, using default:', expression);
    expression = DEFAULT_DAILY_CRON;
  }
  dailyTask = cron.schedule(expression, () => runDailyPipeline().catch(console.error));
}

function scheduleMonthly() {
  if (monthlyTask) monthlyTask.stop();
  monthlyTask = cron.schedule(MONTHLY_CRON, async () => {
    // Generate the report for the month that just ended.
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ym = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    try {
      await generateMonthlyReport(ym);
    } catch (err) {
      console.error('[scheduler] monthly failed:', err);
    }
  });
}

export async function runDailyPipeline(date?: string) {
  const targetDate = date ?? todayDate();

  // 1) Evaluate yesterday's open suggestions against today's measurements.
  const m = metricsForDay(targetDate);
  const yesterday = metricsForDay(prevDay(targetDate));
  const yesterdayReport = getDailyReport(prevDay(targetDate));
  const score = dayScore(targetDate, m, yesterdayReport?.score, recentAvg(targetDate));
  evaluateSuggestions(targetDate, m, score);

  // 2) Generate today's report + tomorrow's suggestions.
  const history = recentScoreHistory(targetDate);
  const report = await generateDailyReport(targetDate, m, score, yesterday, history);

  // 3) If this is the last day of the month, also kick a monthly.
  if (ymOf(addDays(targetDate, 1)) !== ymOf(targetDate)) {
    await generateMonthlyReport(currentYm()).catch(console.error);
  }

  return report;
}

function prevDay(d: string): string {
  return addDays(d, -1);
}

function recentAvg(date: string): number {
  const history = recentScoreHistory(date);
  if (history.length === 0) return 0;
  return Math.round(history.reduce((a, b) => a + b.value, 0) / history.length);
}

function recentScoreHistory(upTo: string, days = 7) {
  const out = [];
  for (let i = 1; i <= days; i++) {
    const iso = addDays(upTo, -i);
    const m = metricsForDay(iso);
    if (m.totalActiveMins === 0) continue;
    out.push(dayScore(iso, m));
  }
  return out;
}

export function stopSchedulers() {
  if (dailyTask) dailyTask.stop();
  if (monthlyTask) monthlyTask.stop();
  dailyTask = null;
  monthlyTask = null;
}
