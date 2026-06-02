import React, { useEffect, useState } from 'react';
import { Card, SectionLabel, ToneDot } from '../components/Primitives';
import { BrandLogo } from '../components/BrandLogo';
import { api, fmtMins } from '../lib/api';
import { SOURCES, GROUP_LABELS } from '../lib/sources';
import type { DayMetrics } from '@shared/types';

export function Integrations() {
  const [metrics, setMetrics] = useState<DayMetrics | null>(null);

  useEffect(() => { api.today.metrics().then(setMetrics); }, []);

  const grouped: Record<string, typeof SOURCES> = {};
  for (const s of SOURCES) {
    (grouped[s.group] ??= []).push(s);
  }

  return (
    <div className="view-scroll view-enter" style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100, margin: '0 auto' }}>
        <Card>
          <SectionLabel right={
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
              {metrics ? Object.keys(metrics.bySource).length : 0} of {SOURCES.length} active today
            </span>
          }>Tracked sources</SectionLabel>
          <p style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
            Pulse identifies these tools automatically from your foreground window activity. Apps
            you never open won't appear in the dashboard, but the entry stays here so you can
            confirm Pulse can recognise it if you do.
          </p>

          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ marginTop: 14 }}>
              <div className="micro-label" style={{ marginBottom: 8 }}>{GROUP_LABELS[group as keyof typeof GROUP_LABELS]}</div>
              <div className="avail-grid">
                {items.map(s => {
                  const data = metrics?.bySource[s.id];
                  const active = !!data && data.mins > 0;
                  return (
                    <Card key={s.id} pad="11px 13px" className="hover-lift"
                      style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <BrandLogo id={s.id} size={32} radius={8} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)' }}>{s.label}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2 }}>
                          {active ? `${fmtMins(data!.mins)} · ${data!.events} sessions` : 'no activity today'}
                        </div>
                      </div>
                      <ToneDot tone={active ? 'ok' : 'idle'} />
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
