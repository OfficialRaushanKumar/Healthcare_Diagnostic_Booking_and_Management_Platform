export function money(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

/** 'YYYY-MM-DD' -> local Date without UTC shifting. */
export function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}
export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  return parseDate(d).toLocaleDateString('en-IN', opts);
}
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}
export const TZ_LABEL = 'IST (UTC+5:30)';
export function timeRange(a: string, b: string) { return `${formatTime(a)} – ${formatTime(b)}`; }
export function label(s: string) { return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' '); }
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function minutesLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
}
