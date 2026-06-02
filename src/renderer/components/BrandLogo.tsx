// Brand badge — a tinted square with the first letter of the brand on top.
// We deliberately don't ship pixel-perfect brand SVGs (which would require
// vendor brand-kit licenses); the letter mark is clean and unambiguous.

import React from 'react';
import { SOURCES } from '../lib/sources';

export function BrandLogo({ id, size = 26, radius = 7 }: { id: string; size?: number; radius?: number }) {
  const s = SOURCES.find(x => x.id === id);
  if (!s) {
    return (
      <span style={{ width: size, height: size, borderRadius: radius,
        background: 'var(--bg-hover)', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontSize: size * 0.46, fontWeight: 700, color: 'var(--fg-3)' }}>?</span>
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: radius, background: s.color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: size * 0.46, fontWeight: 700, color: '#fff',
      letterSpacing: '-0.02em'
    }}>
      {s.brandLetter ?? s.label.charAt(0)}
    </span>
  );
}
