-- Pulse local SQLite schema. Append-only events + derived rollups.

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL,           -- unix ms start
  end_ts      INTEGER NOT NULL,           -- unix ms end
  app         TEXT NOT NULL,
  title       TEXT,
  url         TEXT,
  category    TEXT NOT NULL,              -- deepwork/meetings/comms/reviews/planning/distract/learning/context/other
  source_id   TEXT,                       -- mapped Pulse source (cursor, slack, jira, ...)
  idle        INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_end_ts ON events(end_ts);
CREATE INDEX IF NOT EXISTS idx_events_app ON events(app);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

CREATE TABLE IF NOT EXISTS daily_reports (
  date            TEXT PRIMARY KEY,       -- YYYY-MM-DD (local)
  score           INTEGER NOT NULL,
  band            TEXT,
  components_json TEXT NOT NULL,
  metrics_json    TEXT NOT NULL,
  headline        TEXT,
  observations_json TEXT,
  generated_at    INTEGER NOT NULL,
  model           TEXT
);

CREATE TABLE IF NOT EXISTS suggestions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,          -- date the suggestion targets (i.e., tomorrow at gen time)
  title           TEXT NOT NULL,
  detail          TEXT,
  impact          TEXT NOT NULL,          -- High / Medium / Low
  target_json     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',
  outcome         TEXT,                   -- followed / partial / not_followed
  outcome_delta_json TEXT,
  evaluated_on    TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suggestions_date ON suggestions(date);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);

CREATE TABLE IF NOT EXISTS monthly_reports (
  ym               TEXT PRIMARY KEY,       -- YYYY-MM
  avg_score        INTEGER,
  best_day         TEXT,
  best_score       INTEGER,
  worst_day        TEXT,
  worst_score      INTEGER,
  followed_count   INTEGER,
  total_suggestions INTEGER,
  improvement_rate REAL,
  body             TEXT,
  generated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS classifications (
  app       TEXT PRIMARY KEY,
  category  TEXT NOT NULL,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
