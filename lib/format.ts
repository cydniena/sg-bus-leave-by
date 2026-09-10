/**
 * Singapore has no DST and is permanently UTC+08:00, so wall-clock times can be
 * built and parsed with a literal offset. Everything user-facing must format
 * through here — production runs in UTC and would otherwise be 8 hours off.
 */
export const SGT = 'Asia/Singapore';

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: SGT,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "18:01" in Singapore time, regardless of server/browser timezone. */
export function formatTime(d: Date): string {
  return timeFmt.format(d);
}

/** Calendar date in Singapore, as {y, m, d}. */
export function sgtDateParts(d: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SGT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const [y, m, day] = parts.split('-').map(Number);
  return { y, m, d: day };
}

/** Minutes-since-midnight -> the matching instant on `now`'s Singapore date. */
export function plannedDepartureAt(minSinceMidnight: number, now: Date): Date {
  const { y, m, d } = sgtDateParts(now);
  const hh = Math.floor(minSinceMidnight / 60);
  const mm = minSinceMidnight % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return new Date(`${y}-${p(m)}-${p(d)}T${p(hh)}:${p(mm)}:00+08:00`);
}

/** "9 min", "1h 05m". Sign is dropped — callers phrase the direction. */
export function formatDuration(sec: number): string {
  const s = Math.abs(Math.round(sec));
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

/** Countdown form: "4:32", "-0:15" once negative. */
export function formatCountdown(sec: number): string {
  const neg = sec < 0;
  const s = Math.abs(Math.round(sec));
  const m = Math.floor(s / 60);
  return `${neg ? '-' : ''}${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Phrases leaveBy relative to a planned departure.
 * Negative delta => you must leave earlier than you wanted.
 */
export function formatDelta(sec: number): string {
  if (Math.abs(sec) < 60) return 'right on time';
  return sec < 0
    ? `${formatDuration(sec)} earlier than planned`
    : `+${formatDuration(sec)} of extra time`;
}
