import React, { useEffect, useState } from 'react';
import { Card, SectionLabel, Delta, ToneDot } from '../components/Primitives';
import { ScoreRing, StackBar, HourStrip, Sparkline } from '../components/Charts';
import { BrandLogo } from '../components/BrandLogo';
import { Icon, IconGlyph } from '../lib/icons';
import { api, fmtMins } from '../lib/api';
import { SOURCES } from '../lib/sources';
import type { DayMetrics, DayScore, DailyReport, Suggestion } from '@shared/types';

export function Today({ setView }: { setView: (v: string) => void }) {
  const [metrics, setMetrics] = useState<DayMetrics | null>(null);
  const [score, setScore] = useState<DayScore | null>(null);
  const [latestReport, setLatestReport] = useState<DailyReport | null>(null);
  const [openSugs, setOpenSugs] = useState<Suggestion[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [m, s, r, sugs] = await Promise.all([
        api.today.metrics(),
        api.today.score(),
        api.report.latest(),
        api.suggestions.open()
      ]);
      if (!alive) return;
      setMetrics(m); setScore(s); setLatestReport(r); setOpenSugs(sugs);
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!metrics || !score) return <EmptyToday />;

  const hasActivity = metrics.totalActiveMins > 0;

  return (
    <div className="view view-enter">
      <div className="view-scroll">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="hero-grid">
            <ScoreHero score={score} />
            <TimeCard metrics={metrics} />
          </div>
          {hasActivity ? (
            <>
              <SectionLabel
                right={<span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                  {Object.keys(metrics.bySource).length} active today
                </span>}>
                Source activity
              </SectionLabel>
              <SourceGrid metrics={metrics} />
            </>
          ) : (
            <Card>
              <SectionLabel>Getting started</SectionLabel>
              <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>
                Pulse is tracking your foreground apps in the background. Use your computer
                normally for a few minutes and your time allocation, focus blocks, and source
                activity will populate here automatically.
              </p>
            </Card>
          )}
        </div>
      </div>
      <div className="attention-rail">
        <AttentionRail
          report={latestReport}
          suggestions={openSugs}
          onView={() => setView('report')}
        />
      </div>
    </div>
  );
}

function ScoreHero({ score }: { score: DayScore }) {
  return (
    <Card style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ScoreRing value={score.value} band={score.band} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Delta value={score.delta} size={12} />
          <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>vs yesterday</span>
          {score.weekAvg > 0 && <>
            <span style={{ width: 1, height: 11, background: 'var(--stroke-strong)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>7-day avg {score.weekAvg}</span>
          </>}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 6 }}>
          What makes up today’s score
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {score.components.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'var(--bg-hover)', color: 'var(--fg-2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <IconGlyph name={c.icon} size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)', flex: 1 }}>{c.label}</span>
                  <span className="tabnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg-1)' }}>{c.value}</span>
                  <Delta value={c.delta} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2, lineHeight: 1.35 }}>{c.detail}</div>
                <div style={{ height: 4, borderRadius: 3, background: 'var(--bg-hover)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.value}%`,
                    backgroundImage: 'var(--grad)', borderRadius: 3,
                    transition: 'width .6s var(--ease)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TimeCard({ metrics }: { metrics: DayMetrics }) {
  const t = metrics;
  const activeLabel = fmtMins(t.totalActiveMins);
  return (
    <Card>
      <SectionLabel right={
        t.workStart && t.workEnd
          ? <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{t.workStart}–{t.workEnd}</span>
          : null
      }>Time allocation</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span className="tabnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg-1)' }}>
          {activeLabel}
        </span>
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>active</span>
      </div>
      <StackBar segments={t.categories} total={Math.max(1, t.totalActiveMins)} h={13} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', marginTop: 13 }}>
        {t.categories.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--fg-2)', flex: 1, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
            <span className="tabnum" style={{ color: 'var(--fg-1)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {fmtMins(c.mins)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--stroke)', marginTop: 15, paddingTop: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span className="micro-label">Focus intensity by hour</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10,
            color: 'var(--fg-3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />focus
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#7A5AE0', opacity: 0.55,
              marginLeft: 6 }} />meeting
          </span>
        </div>
        <HourStrip hours={t.hours} />
      </div>
    </Card>
  );
}

function SourceGrid({ metrics }: { metrics: DayMetrics }) {
  // Render every active source in the design order
  const active = SOURCES.filter(s => metrics.bySource[s.id]);
  if (active.length === 0) return null;
  return (
    <div className="source-grid">
      {active.map(s => {
        const data = metrics.bySource[s.id];
        return (
          <Card key={s.id} pad="14px" className="hover-lift"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <BrandLogo id={s.id} size={26} radius={7} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)', flex: 1 }}>{s.label}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10,
                color: 'var(--fg-3)' }}>
                <ToneDot tone="ok" />today
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div className="tabnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
                  color: 'var(--fg-1)', lineHeight: 1 }}>
                  {fmtMins(data.mins)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 3 }}>active time</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                {data.events} session{data.events === 1 ? '' : 's'}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function AttentionRail({
  report, suggestions, onView
}: { report: DailyReport | null; suggestions: Suggestion[]; onView: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card pad="14px">
        <SectionLabel
          right={suggestions.length > 0 ? (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)',
              background: 'var(--accent-soft)', padding: '1px 7px', borderRadius: 999 }}>
              {suggestions.length}
            </span>
          ) : null}>
          Open suggestions
        </SectionLabel>
        {suggestions.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
            No open suggestions yet. They'll appear here after your first daily report.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {suggestions.slice(0, 4).map(s => (
              <button key={s.id} className="atn-row">
                <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.sparkle size={13} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)', lineHeight: 1.3 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2 }}>
                    {s.impact} impact · evaluated {s.date}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card pad="0" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 12px' }}>
          <SectionLabel>End-of-day report</SectionLabel>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>
            {report?.headline ?? 'No report yet. Pulse generates the day’s analysis at 6:30 PM.'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11,
            color: 'var(--fg-3)' }}>
            <Icon.clock size={12} /> Generates daily at 6:30 PM
          </div>
        </div>
        <button className="report-cta" onClick={onView}>
          {report ? 'View today’s report' : 'See report view'} <Icon.arrowR size={13} />
        </button>
      </Card>
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="view view-enter">
      <div className="empty">
        <h3>Warming up</h3>
        <p>Pulse just started — give it a couple minutes of usage to populate today's view.</p>
      </div>
    </div>
  );
}
