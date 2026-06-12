// Local-timezone date helpers.
//
// Every "YYYY-MM-DD" string in Pulse names a *local* calendar day —
// score.dayBounds() expands one to local-midnight bounds. Building these
// strings with `toISOString().slice(0, 10)` silently converts to UTC first,
// which flips the date during the evening for anyone west of Greenwich (e.g.
// 8 PM EDT is already "tomorrow" in UTC), making Today query an empty future
// window. All date-string construction must go through these helpers.

export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDateStr(new Date(y, m - 1, d + n));
}
