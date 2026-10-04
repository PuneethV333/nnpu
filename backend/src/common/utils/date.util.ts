/**
 * Timezone helpers shared by the cron jobs.
 *
 * The school runs on IST. Two separate mistakes used to live in this area:
 *
 * 1. `@Cron('30 9 * * 1-6')` has no timezone, so it fires at 09:30 *server*
 *    time. On a UTC host (Render, or any container) that is 15:00 IST — staff
 *    were reminded about attendance mid-afternoon. The fix is to pass an
 *    explicit `timeZone`, not to shift the expression by hand: a fixed offset
 *    would be wrong for a host that is itself set to IST, and would ignore
 *    daylight saving in any zone that observes it.
 *
 * 2. `Attendance.date` / `AcademicCalendarDay.date` are `@db.Date` columns,
 *    which Prisma reads and writes as UTC midnight. A job that derives "today"
 *    from *local* midnight therefore addresses a different row than one that
 *    derives it from UTC midnight. Since `Attendance` is unique on
 *    `[studentId, date]`, that disagreement doesn't just mis-report — the seed
 *    creates rows for one day while the reminder counts another, so teachers
 *    are told attendance is missing when it is actually recorded.
 *
 * Both jobs now call `zonedToday()` so there is exactly one definition of the
 * current school day.
 */

/**
 * Resolved per call rather than at module load: `LoggerService` already reads
 * NODE_ENV at import time, before dotenv has populated process.env, and that
 * ordering bug should not be repeated here.
 */
export const schoolTimeZone = (): string =>
  process.env['SCHOOL_TIMEZONE'] ?? 'Asia/Kolkata';

const zonedParts = (
  now: Date,
  timeZone: string,
): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };
};

/**
 * The current calendar day **in the school's timezone**, expressed as UTC
 * midnight so it compares equal to a `@db.Date` column.
 *
 * Deliberately not `new Date().setHours(0, 0, 0, 0)`, which yields local
 * midnight, and not plain UTC midnight, which is the *previous* day for any
 * moment between local midnight and the UTC offset — i.e. exactly the early
 * morning hours the 06:00 seed runs in.
 */
export const zonedToday = (
  now: Date = new Date(),
  timeZone: string = schoolTimeZone(),
): Date => {
  const { year, month, day } = zonedParts(now, timeZone);

  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * ISO weekday (1 = Monday … 7 = Sunday) in the school's timezone.
 *
 * Not `Date.prototype.getDay()`, which is 0-based with Sunday first and indexes
 * server-local time — both of which silently shift the answer.
 */
export const zonedIsoWeekday = (
  now: Date = new Date(),
  timeZone: string = schoolTimeZone(),
): number => {
  const { year, month, day } = zonedParts(now, timeZone);

  // Date.UTC with the same Y/M/D, read back as getUTCDay(): a pure calendar
  // calculation with no DST or offset involvement.
  const sundayBased = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return sundayBased === 0 ? 7 : sundayBased;
};

/** `YYYY-MM-DD`, the form used as the canonical day key in log messages. */
export const toDayKey = (date: Date): string =>
  date.toISOString().split('T')[0];
