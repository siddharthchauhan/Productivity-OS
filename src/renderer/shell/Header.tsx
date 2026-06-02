import React from 'react';
import { Icon } from '../lib/icons';
import { ymdLabel } from '../lib/api';
import type { TrackerStatus } from '@shared/types';

const TITLES: Record<string, string> = {
  today: 'Today',
  report: 'Daily report',
  trends: 'Trends',
  integrations: 'Integrations',
  settings: 'Settings'
};

export function Header({
  view, mode, toggleMode, openSettings, trackerStatus
}: {
  view: string;
  mode: 'light' | 'dark';
  toggleMode: () => void;
  openSettings: () => void;
  trackerStatus: TrackerStatus | null;
}) {
  const running = trackerStatus?.running;
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flex: 1, minWidth: 0 }}>
        <span className="header-title">{TITLES[view] ?? 'Pulse'}</span>
        <span className="header-date">{ymdLabel(new Date().toISOString().slice(0, 10))}</span>
      </div>
      <div className="header-status">
        <span className={'status-dot ' + (running ? '' : 'idle')} />
        {running
          ? `tracking ${trackerStatus?.currentApp ?? '…'}`
          : 'tracker paused'}
      </div>
      <button className="iconbtn" title="Toggle light / dark" onClick={toggleMode}>
        {mode === 'light' ? <Icon.moon /> : <Icon.sun />}
      </button>
      <button className="iconbtn" title="Settings" onClick={openSettings}>
        <Icon.sliders />
      </button>
    </header>
  );
}
