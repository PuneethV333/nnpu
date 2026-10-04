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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);

  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
};

/** `YYYY-MM-DD`, the form used as the canonical day key in log messages. */
export const toDayKey = (date: Date): string =>
  date.toISOString().split('T')[0];
