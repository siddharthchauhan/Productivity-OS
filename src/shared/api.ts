// The contract the preload bridge exposes to the renderer.
// `window.api` matches this type 1:1.

import type {
  AppSettings,
  DailyReport,
  DayMetrics,
  DayScore,
  MonthlyReport,
  Suggestion,
  TrackerStatus
} from './types';

export interface PulseAPI {
  tracker: {
    start(): Promise<void>;
    stop(): Promise<void>;
    status(): Promise<TrackerStatus>;
  };
  today: {
    score(): Promise<DayScore>;
    metrics(): Promise<DayMetrics>;
  };
  day: {
    metrics(date: string): Promise<DayMetrics>;
    score(date: string): Promise<DayScore>;
  };
  report: {
    latest(): Promise<DailyReport | null>;
    forDate(date: string): Promise<DailyReport | null>;
    generateNow(): Promise<DailyReport>;
  };
  suggestions: {
    open(): Promise<Suggestion[]>;
    history(limit?: number): Promise<Suggestion[]>;
    dismiss(id: number): Promise<void>;
  };
  monthly: {
    latest(): Promise<MonthlyReport | null>;
    forMonth(ym: string): Promise<MonthlyReport | null>;
    generateNow(ym?: string): Promise<MonthlyReport>;
  };
  trends: {
    week(): Promise<DayScore[]>;
    improvementRate(days: number): Promise<{ followed: number; total: number; rate: number }>;
  };
  settings: {
    get(): Promise<AppSettings>;
    set(patch: Partial<AppSettings>): Promise<AppSettings>;
    setAnthropicKey(key: string): Promise<{ ok: boolean }>;
    clearAnthropicKey(): Promise<void>;
  };
  classifier: {
    listOverrides(): Promise<Array<{ app: string; category: string; sourceId?: string }>>;
    setOverride(app: string, category: string, sourceId?: string): Promise<void>;
  };
}

declare global {
  interface Window {
    api: PulseAPI;
  }
}
