import React from 'react';
import { Icon, IconGlyph } from '../lib/icons';
import { ToneDot } from '../components/Primitives';
import { BrandLogo } from '../components/BrandLogo';
import { SOURCES } from '../lib/sources';
import type { DayMetrics } from '@shared/types';

type ViewId = 'today' | 'report' | 'trends' | 'integrations' | 'settings';

const NAV: Array<{ id: ViewId; label: string; icon: string; badge?: string }> = [
  { id: 'today', label: 'Today', icon: 'activity' },
  { id: 'report', label: 'Daily report', icon: 'file' },
  { id: 'trends', label: 'Trends', icon: 'trending' },
  { id: 'integrations', label: 'Integrations', icon: 'plug' }
];

export function Sidebar({
  view, setView, openSettings, todayMetrics
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
  openSettings: () => void;
  todayMetrics: DayMetrics | null;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h4l2.5 7 4-15 2.5 8h5" />
          </svg>
        </div>
        <span className="brand-name">Pulse<em>.</em></span>
      </div>

      <div className="sidebar-nav">
        {NAV.map(n => (
          <button key={n.id}
            className={'row' + (view === n.id ? ' active' : '')}
            onClick={() => setView(n.id)}>
            <IconGlyph name={n.icon} />
            <span>{n.label}</span>
            {n.badge && (
              <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent)',
                background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 999 }}>
                {n.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="sidebar-section"><div className="micro-label">Tracking</div></div>
      <div className="sidebar-tracking">
        {SOURCES.map(s => {
          const data = todayMetrics?.bySource[s.id];
          const tone = !data ? 'idle' : data.mins > 0 ? 'ok' : 'idle';
          return (
            <div key={s.id} className="row" style={{ cursor: 'default', padding: '4px 8px',
              fontSize: 12, color: 'var(--fg-2)' }}>
              <BrandLogo id={s.id} size={16} radius={4} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis' }}>{s.label}</span>
              <ToneDot tone={tone} />
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <span style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--grad)',
          color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
        }}>P</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)' }}>You</div>
          <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>Local · private</div>
        </div>
        <button className="iconbtn sm" title="Settings" onClick={openSettings}><Icon.settings size={14} /></button>
      </div>
    </aside>
  );
}
