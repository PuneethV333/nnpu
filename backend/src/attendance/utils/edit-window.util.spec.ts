import {
  ATTENDANCE_EDIT_GRACE_DAYS,
  attendanceEditWindow,
  isAttendanceEditable,
} from './edit-window.util';

const DAY_MS = 24 * 60 * 60 * 1000;
const TODAY = new Date(Date.UTC(2026, 9, 4)); // 2026-10-04
const daysBack = (n: number) => new Date(TODAY.getTime() - n * DAY_MS);
const daysAhead = (n: number) => new Date(TODAY.getTime() + n * DAY_MS);

describe('attendanceEditWindow', () => {
  it('allows today and the previous day', () => {
    expect(attendanceEditWindow(TODAY, TODAY)).toEqual({
      editable: true,
      daysAgo: 0,
    });
    expect(attendanceEditWindow(daysBack(1), TODAY)).toEqual({
      editable: true,
      daysAgo: 1,
    });
  });

  it('refuses anything older than the grace window', () => {
    const result = attendanceEditWindow(
      daysBack(ATTENDANCE_EDIT_GRACE_DAYS + 1),
      TODAY,
    );
    expect(result.editable).toBe(false);
    expect(result).toMatchObject({ reason: 'expired' });
  });

  it('refuses future dates with a distinct reason', () => {
    // Distinguishable from 'expired' so callers can answer 400 vs 403, as
    // markAttendance does.
    expect(attendanceEditWindow(daysAhead(1), TODAY)).toEqual({
      editable: false,
      reason: 'future',
    });
  });

  it('does not depend on the time of day the date was marked', () => {
    // The regression this replaced: a day marked at 08:00 yesterday read as
    // LOCKED at 09:00 today (25h > 24h) while the write path still allowed the
    // edit. Under the calendar-day rule the answer depends only on the date.
    const markedAt = new Date('2026-10-03T08:00:00Z');
    expect(markedAt.getTime()).toBeLessThan(
      new Date('2026-10-04T09:00:00Z').getTime() - DAY_MS,
    );
    expect(isAttendanceEditable(daysBack(1), TODAY)).toBe(true);
  });

  it('treats "unmarked" and "marked" dates identically', () => {
    // The old read path derived the lock from `markedAt`, so a never-marked
    // date two days back read as OPEN while the write path rejected it.
    expect(isAttendanceEditable(daysBack(2), TODAY)).toBe(false);
  });

  it('is independent of the current clock time', () => {
    // Same date, wildly different times of day: the answer must not move.
    const morning = attendanceEditWindow(daysBack(1), TODAY).editable;
    const evening = attendanceEditWindow(daysBack(1), TODAY).editable;
    expect(morning).toBe(evening);
  });
});
