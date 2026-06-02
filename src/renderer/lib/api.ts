// Typed shortcut for the preload bridge. Keeps view code clean: `api.today.score()`.

import type { PulseAPI } from '@shared/api';

export const api: PulseAPI = (window as unknown as { api: PulseAPI }).api;

export function fmtMins(m: number): string {
  if (m == null || isNaN(m)) return '0m';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ymdLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function ymdShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
