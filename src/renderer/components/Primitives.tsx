// Layout primitives shared across views.

import React from 'react';

export function Card({ children, style, pad = 'var(--pad-lg)', className = '', ...rest }:
  React.HTMLAttributes<HTMLDivElement> & { pad?: string }) {
  return (
    <div className={'card ' + className}
      style={{ padding: pad, ...style }} {...rest}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="section-label">
      <span className="micro-label">{children}</span>
      <span className="flex-spacer" />
      {right}
    </div>
  );
}

export function ToneDot({ tone }: { tone: 'error' | 'warn' | 'ok' | 'idle' | 'neutral' }) {
  const map: Record<string, string> = {
    error: '#C2502E', warn: '#E0922A', ok: '#1F8A5B', idle: 'var(--fg-3)', neutral: 'var(--fg-3)'
  };
  return (
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: map[tone],
      flexShrink: 0, display: 'inline-block' }} />
  );
}

export function Delta({ value, suffix = '', size = 11 }: { value: number; suffix?: string; size?: number }) {
  if (value === 0 || value == null) {
    return <span style={{ fontSize: size, color: 'var(--fg-3)', fontWeight: 600 }}>·</span>;
  }
  const up = value > 0;
  const col = up ? '#1F8A5B' : '#C2502E';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: size,
      fontWeight: 600, color: col, fontVariantNumeric: 'tabular-nums' }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: up ? 'none' : 'rotate(180deg)' }}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {up ? '+' : ''}{value}{suffix}
    </span>
  );
}
