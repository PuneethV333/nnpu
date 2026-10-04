import {
  schoolTimeZone,
  toDayKey,
  zonedIsoWeekday,
  zonedToday,
} from './date.util';

describe('date.util', () => {
  const originalTz = process.env['SCHOOL_TIMEZONE'];

  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env['SCHOOL_TIMEZONE'];
    } else {
      process.env['SCHOOL_TIMEZONE'] = originalTz;
    }
  });

  describe('schoolTimeZone', () => {
    it('defaults to Asia/Kolkata', () => {
      delete process.env['SCHOOL_TIMEZONE'];
      expect(schoolTimeZone()).toBe('Asia/Kolkata');
    });

    it('is overridable per environment', () => {
      process.env['SCHOOL_TIMEZONE'] = 'Asia/Dubai';
      expect(schoolTimeZone()).toBe('Asia/Dubai');
    });

    it('reads the environment at call time, not module load', () => {
      // Regression class: LoggerService reads NODE_ENV at import time, before
      // dotenv has populated process.env, so it silently ignores .env.
      process.env['SCHOOL_TIMEZONE'] = 'Europe/London';
      expect(schoolTimeZone()).toBe('Europe/London');
    });
  });

  describe('zonedToday', () => {
    it('returns UTC midnight so it equals a @db.Date column', () => {
      const result = zonedToday(
        new Date('2026-01-07T04:00:00.000Z'),
        'Asia/Kolkata',
      );

      expect(result.toISOString()).toBe('2026-01-07T00:00:00.000Z');
    });

    it('keeps the IST calendar day during the early UTC hours', () => {
      // 00:30 UTC on the 7th is 06:00 IST on the 7th: still the 7th.
      expect(
        toDayKey(
          zonedToday(new Date('2026-01-07T00:30:00.000Z'), 'Asia/Kolkata'),
        ),
      ).toBe('2026-01-07');
    });

    it('does not roll back to the previous day late in the IST evening', () => {
      // 20:00 UTC on the 7th is 01:30 IST on the 8th: the school is already on
      // the 8th, and plain UTC midnight would wrongly report the 7th.
      expect(
        toDayKey(
          zonedToday(new Date('2026-01-07T20:00:00.000Z'), 'Asia/Kolkata'),
        ),
      ).toBe('2026-01-08');
    });

    it('differs from naive UTC midnight in exactly that window', () => {
      const at = new Date('2026-01-07T20:00:00.000Z');

      const naiveUtc = new Date(
        Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
      );

      expect(toDayKey(naiveUtc)).toBe('2026-01-07');
      expect(toDayKey(zonedToday(at, 'Asia/Kolkata'))).toBe('2026-01-08');
    });

    it('agrees with naive UTC midnight in the early UTC hours', () => {
      // 06:00 IST is 00:30 UTC, so both approaches agree — which is why the
      // 06:00 seed appeared to work while the day definition was still wrong.
      const at = new Date('2026-01-07T00:30:00.000Z');

      const naiveUtc = new Date(
        Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
      );

      expect(toDayKey(zonedToday(at, 'Asia/Kolkata'))).toBe(toDayKey(naiveUtc));
    });

    it('honours a different school timezone', () => {
      // 20:00 UTC on the 7th is 00:00 on the 8th in Dubai (+04:00).
      expect(
        toDayKey(
          zonedToday(new Date('2026-01-07T20:00:00.000Z'), 'Asia/Dubai'),
        ),
      ).toBe('2026-01-08');
    });

    it('handles a zone behind UTC', () => {
      // 02:00 UTC on the 7th is 21:00 on the 6th in New York (-05:00).
      expect(
        toDayKey(
          zonedToday(new Date('2026-01-07T02:00:00.000Z'), 'America/New_York'),
        ),
      ).toBe('2026-01-06');
    });

    it('handles month boundaries', () => {
      expect(
        toDayKey(
          zonedToday(new Date('2026-02-01T20:00:00.000Z'), 'Asia/Kolkata'),
        ),
      ).toBe('2026-02-02');
    });

    it('handles year boundaries', () => {
      expect(
        toDayKey(
          zonedToday(new Date('2025-12-31T19:00:00.000Z'), 'Asia/Kolkata'),
        ),
      ).toBe('2026-01-01');
    });
  });

  describe('toDayKey', () => {
    it('formats as YYYY-MM-DD', () => {
      expect(toDayKey(new Date('2026-01-07T00:00:00.000Z'))).toBe('2026-01-07');
    });
  });
  describe('zonedIsoWeekday', () => {
    it('is ISO 1-based: Monday = 1 … Sunday = 7', () => {
      // 2026-01-05 is a Monday.
      expect(zonedIsoWeekday(new Date('2026-01-05T06:00:00.000Z'), 'UTC')).toBe(
        1,
      );
      // 2026-01-11 is a Sunday.
      expect(zonedIsoWeekday(new Date('2026-01-11T06:00:00.000Z'), 'UTC')).toBe(
        7,
      );
      // 2026-01-10 is a Saturday.
      expect(zonedIsoWeekday(new Date('2026-01-10T06:00:00.000Z'), 'UTC')).toBe(
        6,
      );
    });

    it('agrees with getUTCDay() shifted into ISO form', () => {
      for (let day = 4; day <= 10; day += 1) {
        const at = new Date(Date.UTC(2026, 0, day, 6));
        const utcDay = at.getUTCDay();
        expect(zonedIsoWeekday(at, 'UTC')).toBe(utcDay === 0 ? 7 : utcDay);
      }
    });

    it('uses the school day, not the UTC day, in the early UTC hours', () => {
      // 20:00 UTC on Saturday 10 Jan is 01:30 IST on Sunday 11 Jan.
      // Date.getDay() would say Saturday; the school is already on Sunday.
      const at = new Date('2026-01-10T20:00:00.000Z');

      expect(at.getUTCDay()).toBe(6);
      expect(zonedIsoWeekday(at, 'Asia/Kolkata')).toBe(7);
    });

    it('reports Saturday as 6 for the timetable lookup', () => {
      // Regression: `WEEK_BY_ISO_DAY[getDay()]` returned the *next* day's entry,
      // so Monday showed Tuesday's schedule and Saturday fell off the array.
      expect(zonedIsoWeekday(new Date('2026-01-10T06:00:00.000Z'), 'UTC')).toBe(
        6,
      );
    });
  });
});
