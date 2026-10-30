/**
 * Date helpers.
 *
 * Two different kinds of date cross this app and they must not be confused:
 *
 *  - `User`/`Attendance.date` style `@db.Date` values and the dashboard's
 *    `today.date` are CALENDAR DAYS. They arrive as `YYYY-MM-DD` (or as a Date
 *    at UTC midnight) and describe a day, not an instant.
 *  - Nothing on this screen needs an instant.
 *
 * The app hit a real bug here: `toISODate` built with `toISOString()` converts
 * local midnight to the previous UTC day for any timezone east of UTC, which
 * shifted every attendance row by one. So day keys are always assembled from
 * local getters, and UTC-midnight Dates are always formatted in UTC.
 */

/** Local calendar day as `YYYY-MM-DD`. Never `toISOString()`. */
export const toDayKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Parses a `YYYY-MM-DD` key as a LOCAL date.
 *
 * `new Date('2026-10-30')` is parsed as UTC midnight by the language spec, so
 * anywhere west of UTC it renders as the 29th. This builds it from parts
 * instead.
 */
export const parseDayKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

/**
 * Formats a UTC-midnight Date (what `@db.Date` coerces to) as "30 Oct".
 *
 * `timeZone: 'UTC'` is required: the value means the day of the 30th, and
 * re-projecting it into a local zone would print the 29th for anyone west of
 * Greenwich.
 */
export const formatEventDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** "Friday, 30 October" for the local day. */
export const formatLongDay = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

/** Time-of-day greeting, matching `app/src/libs/useGreeting.ts`. */
export const greetingFor = (d: Date): string => {
  const hour = d.getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
};
