import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './shell/Sidebar';
import { Header } from './shell/Header';
import { Today } from './views/Today';
import { DailyReport } from './views/DailyReport';
import { Trends } from './views/Trends';
import { Integrations } from './views/Integrations';
import { Settings } from './views/Settings';
import { api } from './lib/api';
import type { AppSettings, DayMetrics, TrackerStatus } from '@shared/types';

type ViewId = 'today' | 'report' | 'trends' | 'integrations' | 'settings';

export default function App() {
  const [view, setView] = useState<ViewId>('today');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tracker, setTracker] = useState<TrackerStatus | null>(null);
  const [todayMetrics, setTodayMetrics] = useState<DayMetrics | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load settings and apply theme attrs to <html>
  useEffect(() => {
    api.settings.get().then(s => {
      setSettings(s);
      applyTheme(s);
      if (!s.hasAnthropicKey) setSettingsOpen(true);   // gentle nudge on first launch
    });
  }, []);

  useEffect(() => {
    if (settings) applyTheme(settings);
  }, [settings]);

  // Poll tracker status + today metrics for the header + sidebar
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [s, m] = await Promise.all([api.tracker.status(), api.today.metrics()]);
      if (!alive) return;
      setTracker(s);
      setTodayMetrics(m);
    };
    refresh();
    const id = window.setInterval(refresh, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const toggleMode = useCallback(async () => {
    if (!settings) return;
    const next: AppSettings['theme'] = settings.theme === 'light' ? 'dark' : 'light';
    const merged = await api.settings.set({ theme: next });
    setSettings(merged);
  }, [settings]);

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={(v) => setView(v as ViewId)}
        openSettings={() => setSettingsOpen(true)}
        todayMetrics={todayMetrics}
      />
      <main className="main">
        <Header
          view={view}
          mode={settings?.theme ?? 'light'}
          toggleMode={toggleMode}
          openSettings={() => setSettingsOpen(true)}
          trackerStatus={tracker}
        />
        {view === 'today'        && <Today setView={setView as (v: string) => void} />}
        {view === 'report'       && <DailyReport />}
        {view === 'trends'       && <Trends />}
        {view === 'integrations' && <Integrations />}
      </main>
      {settingsOpen && settings && (
        <Settings settings={settings} onChange={setSettings}
          onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

function applyTheme(s: AppSettings) {
  const html = document.documentElement;
  html.setAttribute('data-theme', 'canvas');
  html.setAttribute('data-mode', s.theme);
  html.setAttribute('data-grad', s.gradient);
}
