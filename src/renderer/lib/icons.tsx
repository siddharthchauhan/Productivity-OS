// Minimal Lucide-style icon set used by the Pulse UI.

import React from 'react';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

function wrap(d: React.ReactNode, props: IconProps) {
  const { size = 16, color = 'currentColor', strokeWidth = 1.7 } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {d}
    </svg>
  );
}

export const Icon = {
  activity:  (p: IconProps) => wrap(<path d="M3 12h4l3 8 4-16 3 8h4" />, p),
  file:      (p: IconProps) => wrap(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>, p),
  gitBranch: (p: IconProps) => wrap(<><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></>, p),
  plug:      (p: IconProps) => wrap(<><path d="M9 2v6" /><path d="M15 2v6" /><path d="M5 8h14v3a7 7 0 0 1-14 0z" /><path d="M12 18v4" /></>, p),
  timer:     (p: IconProps) => wrap(<><line x1="10" y1="2" x2="14" y2="2" /><line x1="12" y1="14" x2="15" y2="11" /><circle cx="12" cy="14" r="8" /></>, p),
  sparkle:   (p: IconProps) => wrap(<><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" /></>, p),
  mail:      (p: IconProps) => wrap(<><path d="M4 4h16v16H4z" /><polyline points="22,6 12,13 2,6" /></>, p),
  shield:    (p: IconProps) => wrap(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, p),
  bell:      (p: IconProps) => wrap(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>, p),
  users:     (p: IconProps) => wrap(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>, p),
  clock:     (p: IconProps) => wrap(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>, p),
  camera:    (p: IconProps) => wrap(<><path d="M23 7l-7 5 7 5z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>, p),
  code:      (p: IconProps) => wrap(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>, p),
  terminal:  (p: IconProps) => wrap(<><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>, p),
  music:     (p: IconProps) => wrap(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>, p),
  play:      (p: IconProps) => wrap(<polygon points="5 3 19 12 5 21 5 3" />, p),
  badge:     (p: IconProps) => wrap(<><path d="M12 3l3 6 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.1 21 7.2 14.5 2.5 9.9 9 9z" /></>, p),
  globe:     (p: IconProps) => wrap(<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>, p),
  book:      (p: IconProps) => wrap(<><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></>, p),
  warning:   (p: IconProps) => wrap(<><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>, p),
  brain:     (p: IconProps) => wrap(<path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3 3 3 0 0 0 2 3 3 3 0 0 0 1 4 3 3 0 0 0 3 3 3 3 0 0 0 3-2 3 3 0 0 0 3 2 3 3 0 0 0 3-3 3 3 0 0 0 1-4 3 3 0 0 0 2-3 3 3 0 0 0-3-3V7a3 3 0 0 0-3-3 3 3 0 0 0-3 2 3 3 0 0 0-3-2z" />, p),
  workbench: (p: IconProps) => wrap(<><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /></>, p),
  sheet:     (p: IconProps) => wrap(<><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="12" y1="3" x2="12" y2="21" /></>, p),
  slides:    (p: IconProps) => wrap(<><rect x="2" y="4" width="20" height="14" rx="2" /><line x1="6" y1="22" x2="18" y2="22" /></>, p),
  doc:       (p: IconProps) => wrap(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></>, p),
  arrowR:    (p: IconProps) => wrap(<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>, p),
  plus:      (p: IconProps) => wrap(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, p),
  check:     (p: IconProps) => wrap(<polyline points="20 6 9 17 4 12" />, p),
  x:         (p: IconProps) => wrap(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, p),
  download:  (p: IconProps) => wrap(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>, p),
  refresh:   (p: IconProps) => wrap(<><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>, p),
  settings:  (p: IconProps) => wrap(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>, p),
  sliders:   (p: IconProps) => wrap(<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>, p),
  sun:       (p: IconProps) => wrap(<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>, p),
  moon:      (p: IconProps) => wrap(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />, p),
  trending:  (p: IconProps) => wrap(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>, p),
};

export type IconName = keyof typeof Icon;

export function IconGlyph({ name, size, color }: { name: string; size?: number; color?: string }) {
  const Cmp = (Icon as Record<string, (p: IconProps) => React.ReactElement>)[name];
  if (!Cmp) return <Icon.activity size={size} color={color} />;
  return <Cmp size={size} color={color} />;
}
