import { schoolTimeZone, toDayKey, zonedToday } from './date.util';

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
});
