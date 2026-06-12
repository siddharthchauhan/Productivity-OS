// Registers every IPC channel `window.api` invokes. Each handler is a thin
// wrapper around domain code — no business logic lives here.

import { ipcMain } from 'electron';
import type { AppSettings } from '@shared/types';
import { addDays } from '@shared/dates';
import { startTracker, stopTracker, trackerStatus } from './tracker';
import { metricsForDay, todayDate, emptyMetrics, ymOf } from './metrics';
import { dayScore } from './score';
import { runDailyPipeline } from './scheduler';
import { generateMonthlyReport, currentYm } from './ai/monthly';
import {
  dismissSuggestion,
  getDailyReport,
  getLatestMonthly,
  getLatestReport,
  getMonthlyReport,
  improvementRate,
  listOpenSuggestions,
  listRecentSuggestions,
  listClassifications,
  setClassification,
  getSetting,
  setSetting
} from './db/repo';
import {
  clearApiKey,
  getModel,
  hasApiKey,
  setApiKey,
  setModel
} from './ai/client';

const SETTINGS_KEY = 'app_settings_json';

const DEFAULTS: AppSettings = {
  hasAnthropicKey: false,
  model: 'claude-sonnet-4-6',
  trackingEnabled: true,
  captureWindowTitles: true,
  dailyCron: '30 18 * * *',
  showScore: true,
  theme: 'light',
  gradient: 'azure'
};

export function registerIpc() {
  // tracker
  ipcMain.handle('tracker:start', async () => {
    const s = readSettings();
    await startTracker({ captureTitles: s.captureWindowTitles });
  });
  ipcMain.handle('tracker:stop', () => stopTracker());
  ipcMain.handle('tracker:status', () => trackerStatus());

  // today
  ipcMain.handle('today:metrics', () => metricsForDay(todayDate()));
  ipcMain.handle('today:score', () => {
    const m = metricsForDay(todayDate());
    return dayScore(todayDate(), m);
  });

  // arbitrary day
  ipcMain.handle('day:metrics', (_e, date: string) => metricsForDay(date));
  ipcMain.handle('day:score', (_e, date: string) => {
    const m = metricsForDay(date);
    return dayScore(date, m);
  });

  // reports
  ipcMain.handle('report:latest', () => getLatestReport());
  ipcMain.handle('report:forDate', (_e, date: string) => getDailyReport(date));
  ipcMain.handle('report:generateNow', async () => runDailyPipeline());

  // suggestions
  ipcMain.handle('sug:open', () => listOpenSuggestions());
  ipcMain.handle('sug:history', (_e, limit?: number) => listRecentSuggestions(limit ?? 50));
  ipcMain.handle('sug:dismiss', (_e, id: number) => dismissSuggestion(id));

  // monthly
  ipcMain.handle('monthly:latest', () => getLatestMonthly());
  ipcMain.handle('monthly:forMonth', (_e, ym: string) => getMonthlyReport(ym));
  ipcMain.handle('monthly:generateNow', async (_e, ym?: string) => generateMonthlyReport(ym ?? currentYm()));

  // trends
  ipcMain.handle('trends:week', () => weekScores());
  ipcMain.handle('trends:improvementRate', (_e, days: number) => improvementRate(days));

  // settings
  ipcMain.handle('settings:get', () => {
    const s = readSettings();
    s.hasAnthropicKey = hasApiKey();
    s.model = getModel();
    return s;
  });
  ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>) => {
    const merged = { ...readSettings(), ...patch };
    writeSettings(merged);
    if (patch.model) setModel(patch.model);
    merged.hasAnthropicKey = hasApiKey();
    return merged;
  });
  ipcMain.handle('settings:setKey', (_e, key: string) => ({ ok: setApiKey(key) }));
  ipcMain.handle('settings:clearKey', () => clearApiKey());

  // classifier
  ipcMain.handle('clf:list', () => listClassifications());
  ipcMain.handle('clf:set', (_e, app: string, category: string, sourceId?: string) =>
    setClassification(app, category as any, sourceId)
  );
}

function readSettings(): AppSettings {
  const raw = getSetting(SETTINGS_KEY);
  if (!raw) return { ...DEFAULTS };
  try { return { ...DEFAULTS, ...JSON.parse(raw) }; } catch { return { ...DEFAULTS }; }
}

function writeSettings(s: AppSettings) {
  setSetting(SETTINGS_KEY, JSON.stringify(s));
}

function weekScores() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const iso = addDays(todayDate(), -i);
    const m = metricsForDay(iso);
    out.push(dayScore(iso, m.totalActiveMins === 0 ? emptyMetrics(iso) : m));
  }
  return out;
}

export function _currentYm() { return ymOf(todayDate()); }
