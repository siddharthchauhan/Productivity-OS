import React, { useEffect, useState } from 'react';
import { Card, SectionLabel, Delta } from '../components/Primitives';
import { Donut } from '../components/Charts';
import { Icon } from '../lib/icons';
import { api, fmtMins, ymdLabel } from '../lib/api';
import type { DailyReport as Report } from '@shared/types';

export function DailyReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.report.latest().then(setReport); }, []);

  const generate = async () => {
    setGenerating(true);
    setErr(null);
    try {
      const r = await api.report.generateNow();
      setReport(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  if (!report) {
    return (
      <div className="view view-enter">
        <div className="empty">
          <h3>No daily report yet</h3>
          <p>
            Pulse generates a report at 6:30 PM each day. You can also trigger one now —
            it'll analyze whatever data we've captured so far.
          </p>
          <button className="btn-accent" onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate now'}
          </button>
          {err && <div style={{ fontSize: 12, color: '#C2502E', marginTop: 8 }}>{err}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'auto', height: '100%', padding: '22px 0 40px' }} className="view-enter">
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)',
                padding: '3px 9px', borderRadius: 999 }}>Daily report</span>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                {ymdLabel(report.date)} · {report.model ?? 'local fallback'}
              </span>
            </div>
            <h2 style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.02em',
              color: 'var(--fg-1)', lineHeight: 1.25, margin: 0 }}>
              {report.headline}
            </h2>
          </div>
          <Card pad="16px" style={{ flexShrink: 0, textAlign: 'center', width: 132 }}>
            <div className="grad-text tabnum" style={{
              fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1
            }}>{report.score.value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 3 }}>productivity score</div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
              <Delta value={report.score.delta} size={12} />
            </div>
          </Card>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>Score breakdown</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
            {report.score.components.map(c => (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)', flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
                    {Math.round(c.weight * 100)}% weight
                  </span>
                  <span className="tabnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>{c.value}</span>
                  <Delta value={c.delta} />
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.value}%`,
                    backgroundImage: 'var(--grad)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, marginBottom: 16 }}>
          <Card>
            <SectionLabel>Where the day went</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Donut data={report.time.categories} total={Math.max(1, report.time.totalActiveMins)} size={116} stroke={18} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)' }}>
                    {fmtMins(report.time.totalActiveMins)}
                  </span>
                  <span style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>active</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {report.time.categories.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--fg-2)', flex: 1, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                    <span className="tabnum" style={{ color: 'var(--fg-1)', fontWeight: 600 }}>
                      {Math.round(c.mins / Math.max(1, report.time.totalActiveMins) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SectionLabel>Observations</SectionLabel>
            <div>
              {report.observations.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '11px 0',
                  borderTop: i ? '1px solid var(--stroke)' : 'none' }}>
                  <div style={{ width: 132, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{o.metric}</div>
                    <div className="tabnum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)',
                      letterSpacing: '-0.01em', marginTop: 2 }}>{o.value}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 1 }}>{o.vs}</div>
                  </div>
                  <p style={{ flex: 1, fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5, margin: 0,
                    alignSelf: 'center' }}>{o.note}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <SectionLabel>Recommended actions</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.suggestions.map((s, i) => (
            <Card key={s.id ?? i} pad="14px 16px" className="hover-lift"
              style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13
              }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{s.title}</span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: s.impact === 'High' ? '#C2502E' : 'var(--fg-3)',
                    background: s.impact === 'High' ? 'rgba(194,80,46,0.1)' : 'var(--bg-hover)',
                    padding: '2px 7px', borderRadius: 999
                  }}>{s.impact} impact</span>
                  {s.outcome && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      color: s.outcome === 'followed' ? '#1F8A5B' : s.outcome === 'partial' ? '#E0922A' : 'var(--fg-3)',
                      background: 'var(--bg-hover)', padding: '2px 7px', borderRadius: 999
                    }}>{s.outcome.replace('_', ' ')}</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5,
                  margin: '5px 0 0' }}>{s.detail}</p>
                <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 6 }}>
                  Target: <code className="mono">{s.target.metric} {s.target.op} {s.target.value}</code>
                </div>
              </div>
              {s.id !== undefined && !s.outcome && (
                <button className="iconbtn" title="Dismiss" onClick={() => api.suggestions.dismiss(s.id!)}>
                  <Icon.x size={15} />
                </button>
              )}
            </Card>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          marginTop: 22, fontSize: 11, color: 'var(--fg-3)' }}>
          <button className="row" style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
            onClick={generate} disabled={generating}>
            <Icon.refresh size={13} /> {generating ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
}
