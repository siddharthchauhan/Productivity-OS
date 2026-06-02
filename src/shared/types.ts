// Shared types between main, preload, and renderer.
// Keep this file minimal — no Electron or Node imports here.

export type Category =
  | 'deepwork'
  | 'meetings'
  | 'comms'
  | 'reviews'
  | 'planning'
  | 'distract'
  | 'learning'
  | 'context'
  | 'other';

export interface ActivityEvent {
  id?: number;
  ts: number;        // unix ms when the activity began
  endTs: number;     // unix ms when it ended
  app: string;       // app name reported by the OS (e.g., "Cursor", "Slack")
  title?: string;    // foreground window title — optional, can be null for privacy
  url?: string;      // browser URL if extractable (future)
  category: Category;
  sourceId?: string; // mapped to a Pulse "source" (e.g., 'cursor', 'slack', 'jira')
  idle: boolean;
  durationMs: number;
}

export interface ScoreComponent {
  id: 'focus' | 'output' | 'leverage' | 'comms' | 'discipline';
  label: string;
  value: number;     // 0..100
  weight: number;    // 0..1
  delta: number;     // vs yesterday
  detail: string;
  icon: string;
}

export interface DayScore {
  date: string;            // YYYY-MM-DD
  value: number;           // 0..100
  band: string;            // "Strong day" / "Recovery day" / etc.
  delta: number;
  weekAvg: number;
  components: ScoreComponent[];
}

export interface TimeSlice {
  id: Category;
  label: string;
  mins: number;
  color: string;
}

export interface HourBucket {
  hour: number;       // 0..23
  label: string;      // "8a", "3p", etc.
  focus: number;      // 0..100 — derived intensity
  meeting: boolean;
}

export interface DayMetrics {
  date: string;
  workStart?: string;
  workEnd?: string;
  totalActiveMins: number;
  categories: TimeSlice[];
  hours: HourBucket[];
  bySource: Record<string, { mins: number; events: number }>;
  // headline counters used by score + report
  deepFocusMins: number;
  meetingMins: number;
  commsMins: number;
  distractMins: number;
  learningMins: number;
  contextSwitches: number;
}

export interface SuggestionTarget {
  // structured, measurable target so we can evaluate adherence tomorrow
  metric:
    | 'distract_mins'
    | 'deep_focus_mins'
    | 'meeting_mins'
    | 'comms_mins'
    | 'score_value'
    | 'first_block_start_hour' // earliest deep-focus start
    | 'context_switches';
  op: '<=' | '>=' | '==' | '<' | '>';
  value: number;
  // optional window the target applies to (e.g., the first hour of work)
  window?: 'all_day' | 'morning' | 'afternoon';
}

export interface Suggestion {
  id?: number;
  date: string;            // date the suggestion was generated for tomorrow
  title: string;
  detail: string;
  impact: 'High' | 'Medium' | 'Low';
  target: SuggestionTarget;
  status: 'open' | 'dismissed' | 'auto_evaluated';
  outcome?: 'followed' | 'partial' | 'not_followed';
  outcomeDelta?: { actual: number; target: number };
  evaluatedOn?: string;
  createdAt: number;
}

export interface DailyReport {
  date: string;
  score: DayScore;
  time: DayMetrics;
  headline: string;
  observations: Observation[];
  suggestions: Suggestion[];
  generatedAt: number;
  model?: string;
}

export interface Observation {
  metric: string;
  value: string;
  vs: string;
  dir: 'up' | 'down' | 'flat';
  note: string;
}

export interface MonthlyReport {
  ym: string;              // YYYY-MM
  avgScore: number;
  bestDay: { date: string; score: number };
  worstDay: { date: string; score: number };
  improvementRate: number; // % of suggestions followed
  followedCount: number;
  totalSuggestions: number;
  body: string;            // AI-generated narrative
  generatedAt: number;
}

export interface AppSettings {
  hasAnthropicKey: boolean;
  model: string;
  trackingEnabled: boolean;
  captureWindowTitles: boolean;
  dailyCron: string;
  showScore: boolean;
  theme: 'light' | 'dark';
  gradient: 'azure' | 'aurora' | 'ocean' | 'mint' | 'ember';
}

export interface TrackerStatus {
  running: boolean;
  lastEventTs?: number;
  currentApp?: string;
  currentTitle?: string;
  eventCount24h: number;
}
