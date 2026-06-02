import React, { useEffect, useState } from 'react';
import { Card, SectionLabel } from '../components/Primitives';
import { BarChart } from '../components/Charts';
import { api, ymdShort } from '../lib/api';
import type { DayScore, MonthlyReport } from '@shared/types';

export function Trends() {
  const [week, setWeek] = useState<DayScore[]>([]);
  const [imp, setImp] = useState<{ followed: number; total: number; rate: number } | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.trends.week().then(setWeek);
    api.trends.improvementRate(30).then(setImp);
    api.monthly.latest().then(setMonthly);
  }, []);

  const bars = week.map(s => ({
    day: new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    score: s.value
  }));

  const generateMonthly = async () => {
    setGenerating(true);
    try {
      const r = await api.monthly.generateNow();
      setMonthly(r);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="view-scroll view-enter" style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100, margin: '0 auto' }}>
        <div className="stat-row">
          <KPI label="7-day average" value={String(avg(week.map(w => w.value)))} sub="out of 100" />
          <KPI label="Today" value={week.length ? String(week[week.length - 1].value) : '–'} sub="vs week avg" />
          <KPI label="Suggestion follow rate" value={imp ? `${Math.round(imp.rate * 100)}%` : '–'}
            sub={imp ? `${imp.followed} of ${imp.total}` : 'no data yet'} />
          <KPI label="Best day this week" value={String(Math.max(0, ...week.map(w => w.value)))} sub="peak score" />
        </div>

        <Card>
          <SectionLabel right={<span style={{ fontSize: 11, color: 'var(--fg-3)' }}>last 7 days</span>}>
            Productivity score
          </SectionLabel>
          {bars.length === 0 ? <Empty /> :
            <BarChart data={bars} valueKey="score" max={100} h={160} />}
        </Card>

        <Card>
          <SectionLabel
            right={<button className="btn-accent" onClick={generateMonthly} disabled={generating}
              style={{ padding: '6px 12px', fontSize: 11.5 }}>
              {generating ? 'Generating…' : 'Generate now'}
            </button>}>
            Monthly report
          </SectionLabel>
          {!monthly ? (
            <div style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.55 }}>
              No monthly report yet — Pulse generates one on the 1st of each month, or you can
              trigger one now from this month's data.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 14 }}>
                <Stat label="Avg score" value={String(monthly.avgScore)} />
                <Stat label="Best day" value={`${monthly.bestDay.score}`}
                  sub={monthly.bestDay.date ? ymdShort(monthly.bestDay.date) : ''} />
                <Stat label="Worst day" value={`${monthly.worstDay.score}`}
                  sub={monthly.worstDay.date ? ymdShort(monthly.worstDay.date) : ''} />
                <Stat label="Suggestions followed"
                  value={`${monthly.followedCount}/${monthly.totalSuggestions}`}
                  sub={`${Math.round(monthly.improvementRate * 100)}%`} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.65,
                whiteSpace: 'pre-wrap', margin: 0 }}>{monthly.body}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card pad="14px">
      <div className="micro-label">{label}</div>
      <div className="tabnum grad-text" style={{ fontSize: 28, fontWeight: 700,
        letterSpacing: '-0.02em', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sub}</div>}
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="micro-label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="tabnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)',
        letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sub}</div>}
    </div>
  );
}

function Empty() {
  return <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
    Not enough data yet — come back after a couple of tracking days.
  </div>;
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}
