// Repository layer — all SQL lives here. Other modules import these functions
// and never touch the db handle directly.

import type {
  ActivityEvent,
  Category,
  DailyReport,
  MonthlyReport,
  Suggestion,
  SuggestionTarget
} from '@shared/types';
import { db } from './index';

// ---------- events ----------

export function insertEvent(e: ActivityEvent): number {
  const stmt = db().prepare(`INSERT INTO events
    (ts, end_ts, app, title, url, category, source_id, idle, duration_ms)
    VALUES (@ts, @endTs, @app, @title, @url, @category, @sourceId, @idle, @durationMs)`);
  const info = stmt.run({
    ts: e.ts,
    endTs: e.endTs,
    app: e.app,
    title: e.title ?? null,
    url: e.url ?? null,
    category: e.category,
    sourceId: e.sourceId ?? null,
    idle: e.idle ? 1 : 0,
    durationMs: e.durationMs
  });
  return Number(info.lastInsertRowid);
}

export function eventsInRange(startMs: number, endMs: number): ActivityEvent[] {
  const rows = db()
    .prepare(`SELECT * FROM events WHERE end_ts > ? AND ts < ? ORDER BY ts ASC`)
    .all(startMs, endMs) as any[];
  return rows.map(rowToEvent);
}

export function eventCountSince(sinceMs: number): number {
  const row = db().prepare(`SELECT COUNT(*) AS c FROM events WHERE ts >= ?`).get(sinceMs) as { c: number };
  return row.c;
}

function rowToEvent(r: any): ActivityEvent {
  return {
    id: r.id,
    ts: r.ts,
    endTs: r.end_ts,
    app: r.app,
    title: r.title ?? undefined,
    url: r.url ?? undefined,
    category: r.category as Category,
    sourceId: r.source_id ?? undefined,
    idle: !!r.idle,
    durationMs: r.duration_ms
  };
}

// ---------- daily reports ----------

export function saveDailyReport(r: DailyReport): void {
  db().prepare(`INSERT OR REPLACE INTO daily_reports
    (date, score, band, components_json, metrics_json, headline, observations_json, generated_at, model)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    r.date,
    r.score.value,
    r.score.band,
    JSON.stringify(r.score.components),
    JSON.stringify(r.time),
    r.headline,
    JSON.stringify(r.observations),
    r.generatedAt,
    r.model ?? null
  );
}

export function getDailyReport(date: string): DailyReport | null {
  const row = db().prepare(`SELECT * FROM daily_reports WHERE date = ?`).get(date) as any;
  if (!row) return null;
  const suggestions = listSuggestionsByDate(date);
  return {
    date: row.date,
    headline: row.headline,
    generatedAt: row.generated_at,
    model: row.model ?? undefined,
    score: {
      date: row.date,
      value: row.score,
      band: row.band ?? '',
      delta: 0,           // recomputed live by caller if needed
      weekAvg: 0,
      components: JSON.parse(row.components_json)
    },
    time: JSON.parse(row.metrics_json),
    observations: JSON.parse(row.observations_json ?? '[]'),
    suggestions
  };
}

export function getLatestReport(): DailyReport | null {
  const row = db().prepare(`SELECT date FROM daily_reports ORDER BY date DESC LIMIT 1`).get() as any;
  return row ? getDailyReport(row.date) : null;
}

export function listReportsBetween(startDate: string, endDate: string): DailyReport[] {
  const rows = db().prepare(
    `SELECT date FROM daily_reports WHERE date >= ? AND date <= ? ORDER BY date ASC`
  ).all(startDate, endDate) as any[];
  return rows.map(r => getDailyReport(r.date)).filter((x): x is DailyReport => !!x);
}

// ---------- suggestions ----------

export function saveSuggestion(s: Omit<Suggestion, 'id'>): number {
  const info = db().prepare(`INSERT INTO suggestions
    (date, title, detail, impact, target_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    s.date, s.title, s.detail, s.impact,
    JSON.stringify(s.target), s.status, s.createdAt
  );
  return Number(info.lastInsertRowid);
}

export function listSuggestionsByDate(date: string): Suggestion[] {
  const rows = db().prepare(`SELECT * FROM suggestions WHERE date = ?`).all(date) as any[];
  return rows.map(rowToSuggestion);
}

export function listOpenSuggestions(): Suggestion[] {
  const rows = db().prepare(`SELECT * FROM suggestions WHERE status = 'open' ORDER BY date DESC`).all() as any[];
  return rows.map(rowToSuggestion);
}

export function listSuggestionsForEvaluation(forDate: string): Suggestion[] {
  // Suggestions whose target date is `forDate` and that haven't been evaluated yet.
  const rows = db().prepare(
    `SELECT * FROM suggestions WHERE date = ? AND status = 'open'`
  ).all(forDate) as any[];
  return rows.map(rowToSuggestion);
}

export function listRecentSuggestions(limit: number): Suggestion[] {
  const rows = db().prepare(`SELECT * FROM suggestions ORDER BY date DESC, id DESC LIMIT ?`).all(limit) as any[];
  return rows.map(rowToSuggestion);
}

export function setSuggestionOutcome(
  id: number,
  outcome: NonNullable<Suggestion['outcome']>,
  delta: { actual: number; target: number },
  evaluatedOn: string
): void {
  db().prepare(`UPDATE suggestions
    SET outcome = ?, outcome_delta_json = ?, evaluated_on = ?, status = 'auto_evaluated'
    WHERE id = ?`).run(outcome, JSON.stringify(delta), evaluatedOn, id);
}

export function dismissSuggestion(id: number): void {
  db().prepare(`UPDATE suggestions SET status = 'dismissed' WHERE id = ?`).run(id);
}

export function improvementRate(days: number): { followed: number; total: number; rate: number } {
  const since = isoDateNDaysAgo(days);
  const row = db().prepare(
    `SELECT
       SUM(CASE WHEN outcome = 'followed' THEN 1 ELSE 0 END) AS followed,
       SUM(CASE WHEN outcome IN ('followed','partial','not_followed') THEN 1 ELSE 0 END) AS total
     FROM suggestions WHERE date >= ?`
  ).get(since) as { followed: number | null; total: number | null };
  const total = row.total ?? 0;
  const followed = row.followed ?? 0;
  return { followed, total, rate: total === 0 ? 0 : followed / total };
}

function rowToSuggestion(r: any): Suggestion {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    detail: r.detail ?? '',
    impact: r.impact,
    target: JSON.parse(r.target_json) as SuggestionTarget,
    status: r.status,
    outcome: r.outcome ?? undefined,
    outcomeDelta: r.outcome_delta_json ? JSON.parse(r.outcome_delta_json) : undefined,
    evaluatedOn: r.evaluated_on ?? undefined,
    createdAt: r.created_at
  };
}

// ---------- monthly reports ----------

export function saveMonthlyReport(r: MonthlyReport): void {
  db().prepare(`INSERT OR REPLACE INTO monthly_reports
    (ym, avg_score, best_day, best_score, worst_day, worst_score,
     followed_count, total_suggestions, improvement_rate, body, generated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    r.ym, r.avgScore,
    r.bestDay.date, r.bestDay.score,
    r.worstDay.date, r.worstDay.score,
    r.followedCount, r.totalSuggestions, r.improvementRate,
    r.body, r.generatedAt
  );
}

export function getMonthlyReport(ym: string): MonthlyReport | null {
  const row = db().prepare(`SELECT * FROM monthly_reports WHERE ym = ?`).get(ym) as any;
  if (!row) return null;
  return {
    ym: row.ym,
    avgScore: row.avg_score,
    bestDay: { date: row.best_day, score: row.best_score },
    worstDay: { date: row.worst_day, score: row.worst_score },
    followedCount: row.followed_count,
    totalSuggestions: row.total_suggestions,
    improvementRate: row.improvement_rate,
    body: row.body,
    generatedAt: row.generated_at
  };
}

export function getLatestMonthly(): MonthlyReport | null {
  const row = db().prepare(`SELECT ym FROM monthly_reports ORDER BY ym DESC LIMIT 1`).get() as any;
  return row ? getMonthlyReport(row.ym) : null;
}

// ---------- classifications ----------

export function listClassifications(): Array<{ app: string; category: string; sourceId?: string }> {
  const rows = db().prepare(`SELECT * FROM classifications`).all() as any[];
  return rows.map(r => ({ app: r.app, category: r.category, sourceId: r.source_id ?? undefined }));
}

export function getClassification(appName: string): { category: Category; sourceId?: string } | null {
  const row = db().prepare(`SELECT * FROM classifications WHERE app = ?`).get(appName) as any;
  return row ? { category: row.category, sourceId: row.source_id ?? undefined } : null;
}

export function setClassification(appName: string, category: Category, sourceId?: string): void {
  db().prepare(`INSERT OR REPLACE INTO classifications (app, category, source_id) VALUES (?, ?, ?)`)
    .run(appName, category, sourceId ?? null);
}

// ---------- settings ----------

export function getSetting(key: string): string | null {
  const row = db().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db().prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value);
}

// ---------- helpers ----------

function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
