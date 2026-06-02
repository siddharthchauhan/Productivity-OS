// Pure-SVG chart primitives — score ring, sparkline, stacked bar, donut, bar chart.
// No chart library; each is small enough to read end-to-end.

import React, { useEffect, useRef, useState } from 'react';

export function ScoreRing({
  value, size = 168, stroke = 13, band
}: { value: number; size?: number; stroke?: number; band?: string }) {
  const [shown, setShown] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    let start: number | null = null;
    let done = false;
    const dur = 900;
    const guard = setTimeout(() => { if (!done) setShown(value); }, dur + 200);
    const step = (t: number) => {
      if (start === null) start = t;
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(value * eased));
      if (k < 1) rafRef.current = requestAnimationFrame(step);
      else done = true;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(guard);
    };
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - shown / 100);
  const gid = `rg-${size}`;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--grad-from)" />
            <stop offset="55%" stopColor="var(--grad-mid)" />
            <stop offset="100%" stopColor="var(--grad-to)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--bg-hover)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .1s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>
        <div className="grad-text tabnum" style={{ fontSize: size * 0.32, fontWeight: 700, lineHeight: 1,
          letterSpacing: '-0.03em' }}>{shown}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>out of 100</div>
        {band && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)',
          marginTop: 6 }}>{band}</div>}
      </div>
    </div>
  );
}

export function Sparkline({
  data, color = 'var(--accent)', w = 96, h = 30, fill = true
}: { data: number[]; color?: string; w?: number; h?: number; fill?: boolean }) {
  if (data.length === 0) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  const id = 'sg' + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

export function StackBar<T extends { label: string; mins: number; color: string }>({
  segments, total, h = 12, radius = 6, gap = 2
}: { segments: T[]; total: number; h?: number; radius?: number; gap?: number }) {
  if (segments.length === 0 || total === 0) {
    return <div style={{ height: h, borderRadius: radius, background: 'var(--bg-hover)' }} />;
  }
  return (
    <div style={{ display: 'flex', gap, width: '100%', height: h }}>
      {segments.map((s, i) => (
        <div key={i} title={`${s.label} · ${s.mins}m`}
          style={{
            width: `${(s.mins / total) * 100}%`, background: s.color,
            borderRadius: i === 0 ? `${radius}px 2px 2px ${radius}px`
              : i === segments.length - 1 ? `2px ${radius}px ${radius}px 2px` : 2,
            minWidth: 3, transition: 'width .4s var(--ease)'
          }} />
      ))}
    </div>
  );
}

export function Donut<T extends { mins: number; color: string }>({
  data, size = 132, stroke = 20, total
}: { data: T[]; size?: number; stroke?: number; total?: number }) {
  const sum = total ?? data.reduce((a, b) => a + b.mins, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  if (sum === 0) {
    return (
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--bg-hover)" strokeWidth={stroke} />
      </svg>
    );
  }
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {data.map((d, i) => {
        const frac = d.mins / sum;
        const dash = `${(frac * c).toFixed(1)} ${c}`;
        const off = -acc * c;
        acc += frac;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={d.color} strokeWidth={stroke} strokeDasharray={dash}
            strokeDashoffset={off} />
        );
      })}
    </svg>
  );
}

export function BarChart<T extends { day: string }>({
  data, valueKey = 'score', max = 100, h = 120, accentLast = true, fmt
}: {
  data: Array<T & Record<string, number | string>>;
  valueKey?: string; max?: number; h?: number; accentLast?: boolean;
  fmt?: (v: number) => string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: h }}>
      {data.map((d, i) => {
        const v = Number((d as any)[valueKey]);
        const isLast = i === data.length - 1;
        const weekend = d.day === 'Sat' || d.day === 'Sun';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div className="tabnum" style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-2)' }}>
              {fmt ? fmt(v) : v}
            </div>
            <div style={{
              width: '100%', maxWidth: 34, height: `${Math.max(0, Math.min(100, (v / max) * 100))}%`,
              minHeight: 4, borderRadius: '5px 5px 3px 3px',
              background: (accentLast && isLast) ? 'var(--grad)'
                : weekend ? 'var(--bg-press)' : 'var(--stroke-strong)',
              transition: 'height .5s var(--ease)'
            }} />
            <div style={{ fontSize: 10, color: isLast ? 'var(--fg-1)' : 'var(--fg-3)',
              fontWeight: isLast ? 600 : 500 }}>{d.day}</div>
          </div>
        );
      })}
    </div>
  );
}

export function HourStrip({
  hours, height = 56
}: { hours: Array<{ label: string; focus: number; meeting: boolean }>; height?: number }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
        {hours.map((h, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
            title={`${h.label} · ${h.meeting ? 'meeting' : 'focus ' + h.focus}`}>
            <div style={{
              width: '100%', maxWidth: 18,
              height: `${Math.max(3, Math.min(100, h.focus))}%`,
              minHeight: 3, borderRadius: '3px 3px 2px 2px',
              background: h.meeting ? '#7A5AE0' : 'var(--accent)',
              opacity: h.meeting ? 0.55 : Math.max(0.32, h.focus / 100),
              transition: 'height .5s var(--ease)'
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
        {hours.map((h, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--fg-3)' }}>
            {i % 2 === 0 ? h.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
