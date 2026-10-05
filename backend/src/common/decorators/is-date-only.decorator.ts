import { IsDateString, Matches } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

/**
 * A calendar date with no time component, e.g. `2026-10-04`.
 *
 * `IsDateString()` alone is not enough here. It accepts any ISO 8601 datetime,
 * including `2026-10-04T18:30:00.000Z`, and these values are compared against
 * `academicCalendarDay.date` / `Attendance.date`, which are `@db.Date` columns.
 * A timestamp never equals a date, so those requests silently matched no rows
 * instead of failing loudly — or, once run through `new Date()`, picked up a UTC
 * offset that shifted the day.
 *
 * `Matches` pins the exact wire format the app already sends (`toISODate()`
 * in `app/src/libs/week.ts` emits `%Y-%m-%d`). `IsDateString` is kept on top so
 * that format-valid but non-existent dates (`2026-13-45`) are still rejected.
 */
export const IsDateOnly = (): PropertyDecorator =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'must be a calendar date formatted as YYYY-MM-DD',
    }),
    IsDateString(),
  );
