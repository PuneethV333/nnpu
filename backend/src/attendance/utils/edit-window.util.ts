import { zonedToday } from '@/common/utils/date.util';

/**
 * How long after a date attendance may still be edited.
 *
 * 1 = the date itself plus the following day.
 */
export const ATTENDANCE_EDIT_GRACE_DAYS = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The single definition of whether a date is still editable.
 *
 * Both the write path (`markAttendance`) and the read path
 * (`getAttendanceStatus`) call this, which is the whole point: they previously
 * disagreed, so the UI and the API contradicted each other.
 *
 *   - write: keyed on the calendar day (`daysAgo > grace` -> 403).
 *   - read:  keyed on `markedAt` being more than 24 hours old.
 *
 * Three reproducible mismatches, verified against the previous logic:
 *
 *   | date / state                          | API     | UI      |
 *   |---------------------------------------|---------|---------|
 *   | yesterday marked 08:00, now 09:00     | ALLOW   | LOCKED  |
 *   | 2 days ago, never marked              | 403     | OPEN    |
 *   | tomorrow (a working day)              | 400     | OPEN    |
 *
 * The calendar-day rule is the authoritative one: the previous `markedAt`
 * approach meant a past date that had never been marked had no lock at all and
 * stayed editable forever, while a day marked late in the afternoon locked at a
 * moment that had nothing to do with which day it was. `markedAt` is still
 * recorded as an audit fact, it just no longer decides the lock.
 */
export type AttendanceEditWindow =
  | { editable: true; daysAgo: number }
  | { editable: false; reason: 'future' }
  | { editable: false; reason: 'expired'; daysAgo: number };

export const attendanceEditWindow = (
  date: Date,
  today: Date = zonedToday(),
): AttendanceEditWindow => {
  if (date.getTime() > today.getTime()) {
    return { editable: false, reason: 'future' };
  }

  const daysAgo = Math.floor((today.getTime() - date.getTime()) / DAY_MS);

  return daysAgo > ATTENDANCE_EDIT_GRACE_DAYS
    ? { editable: false, reason: 'expired', daysAgo }
    : { editable: true, daysAgo };
};

/** Convenience for read paths, which only need a boolean. */
export const isAttendanceEditable = (
  date: Date,
  today: Date = zonedToday(),
): boolean => attendanceEditWindow(date, today).editable;
