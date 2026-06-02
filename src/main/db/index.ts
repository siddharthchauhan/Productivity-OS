import Database from 'better-sqlite3';
import { app } from 'electron';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const file = join(app.getPath('userData'), 'pulse.sqlite');
  mkdirSync(dirname(file), { recursive: true });
  _db = new Database(file);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');
  applySchema(_db);
  return _db;
}

function applySchema(handle: Database.Database) {
  // Schema is bundled alongside the compiled main process. In dev, electron-vite
  // copies it to the same output dir; in production electron-builder includes it.
  // The inline fallback below means we never crash if the file is missing.
  let sql: string;
  try {
    sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  } catch {
    sql = SCHEMA_FALLBACK;
  }
  // better-sqlite3 multi-statement DDL — pure local string, not user input.
  runMultiStatement(handle, sql);
}

function runMultiStatement(handle: Database.Database, sql: string) {
  handle.transaction(() => {
    // better-sqlite3's multi-statement DDL helper
    (handle as any).exec(sql);
  })();
}

const SCHEMA_FALLBACK = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, end_ts INTEGER NOT NULL,
  app TEXT NOT NULL, title TEXT, url TEXT, category TEXT NOT NULL,
  source_id TEXT, idle INTEGER NOT NULL DEFAULT 0, duration_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_end_ts ON events(end_ts);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE TABLE IF NOT EXISTS daily_reports (
  date TEXT PRIMARY KEY, score INTEGER NOT NULL, band TEXT,
  components_json TEXT NOT NULL, metrics_json TEXT NOT NULL,
  headline TEXT, observations_json TEXT, generated_at INTEGER NOT NULL, model TEXT
);
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT NOT NULL, detail TEXT,
  impact TEXT NOT NULL, target_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  outcome TEXT, outcome_delta_json TEXT, evaluated_on TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suggestions_date ON suggestions(date);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE TABLE IF NOT EXISTS monthly_reports (
  ym TEXT PRIMARY KEY, avg_score INTEGER, best_day TEXT, best_score INTEGER,
  worst_day TEXT, worst_score INTEGER, followed_count INTEGER, total_suggestions INTEGER,
  improvement_rate REAL, body TEXT, generated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS classifications (
  app TEXT PRIMARY KEY, category TEXT NOT NULL, source_id TEXT
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`;
