import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SectionDateQueryDto } from '@/attendance/dto/section-date-query.dto';
import { CalendarRangeQueryDto } from '@/calendar/dto/calendar-range-query.dto';
import { OverrideDayParamDto } from '@/calendar/dto/override-day-param.dto';
import { FeeStructureQueryDto } from '@/fees/dto/fee-structure-query.dto';
import { MySubjectsQueryDto } from '@/marks/dto/my-subjects-query.dto';
import { ReportParamsDto } from '@/marks/dto/report-params.dto';
import {
  MarkAttendanceDto,
  MARKABLE_ATTENDANCE_STATUSES,
} from '@/attendance/dto/mark-attendance.dto';
import { AttendanceStatus } from '@/generated/prisma';

const errorsFor = async (
  cls: new () => object,
  value: Record<string, unknown>,
): Promise<string[]> => {
  const dto = plainToInstance(cls, value);
  const errors = await validate(dto, { whitelist: true });
  return errors.map((e) => e.property);
};

/**
 * These assert the wire contract the controllers rely on. The `undefined`-in-`where`
 * bug was invisible at the service layer, because a missing `sectionId` looks
 * like any other bad input until Prisma silently drops the filter.
 */
describe('query DTO validation', () => {
  describe('SectionDateQueryDto (attendance roster/status)', () => {
    it('accepts a well-formed query', async () => {
      expect(
        await errorsFor(SectionDateQueryDto, {
          sectionId: 'section-1',
          date: '2026-10-04',
        }),
      ).toEqual([]);
    });

    it.each([
      ['missing sectionId', { date: '2026-10-04' }],
      ['empty sectionId', { sectionId: '', date: '2026-10-04' }],
      ['whitespace sectionId', { sectionId: '   ', date: '2026-10-04' }],
      ['missing date', { sectionId: 'section-1' }],
    ])('rejects %s', async (_label, value) => {
      expect(await errorsFor(SectionDateQueryDto, value)).not.toEqual([]);
    });

    it.each([
      ['a full ISO timestamp', '2026-10-04T00:00:00.000Z'],
      ['a datetime with offset', '2026-10-04T18:30:00+05:30'],
      ['a non-existent date', '2026-13-45'],
      ['arbitrary text', 'tomorrow'],
      ['empty string', ''],
    ])('rejects %s as a date', async (_label, date) => {
      // @db.Date lookups need the exact YYYY-MM-DD shape. IsDateString alone
      // accepts timestamps, which silently match zero rows.
      const errors = await errorsFor(SectionDateQueryDto, {
        sectionId: 'section-1',
        date,
      });
      expect(errors).toContain('date');
    });
  });

  describe('CalendarRangeQueryDto', () => {
    it('accepts a month range', async () => {
      expect(
        await errorsFor(CalendarRangeQueryDto, {
          from: '2026-06-01',
          to: '2026-06-30',
        }),
      ).toEqual([]);
    });

    it.each([
      ['timestamp', '2026-06-01T00:00:00.000Z'],
      ['garbage', 'june'],
      ['missing', undefined],
    ])('rejects a %s "from"', async (_label, from) => {
      const errors = await errorsFor(CalendarRangeQueryDto, {
        from,
        to: '2026-06-30',
      });
      expect(errors).toContain('from');
    });
  });

  describe('OverrideDayParamDto', () => {
    it('rejects a timestamped date param', async () => {
      expect(
        await errorsFor(OverrideDayParamDto, {
          date: '2026-10-04T05:00:00.000Z',
        }),
      ).toContain('date');
    });

    it('accepts a plain date', async () => {
      expect(
        await errorsFor(OverrideDayParamDto, { date: '2026-10-04' }),
      ).toEqual([]);
    });
  });

  describe('FeeStructureQueryDto', () => {
    it('requires both parts of the composite unique', async () => {
      // findUnique on sectionId_academicYearId throws (500) if either is absent.
      const errors = await errorsFor(FeeStructureQueryDto, {
        sectionId: 'section-1',
      });
      expect(errors).toContain('academicYearId');
    });
  });

  describe('MySubjectsQueryDto', () => {
    it('requires sectionId', async () => {
      expect(await errorsFor(MySubjectsQueryDto, {})).toContain('sectionId');
    });
  });

  describe('ReportParamsDto', () => {
    it('requires both ids', async () => {
      const errors = await errorsFor(ReportParamsDto, { studentId: 's-1' });
      expect(errors).toContain('subjectId');
    });

    it('rejects an over-long id rather than passing it to Prisma', async () => {
      const errors = await errorsFor(ReportParamsDto, {
        studentId: 'a'.repeat(500),
        subjectId: 'subject-1',
      });
      expect(errors).toContain('studentId');
    });
  });

  describe('MarkAttendanceDto statuses', () => {
    const entry = (status: unknown) => ({
      sectionId: 'section-1',
      date: '2026-10-04',
      entries: [{ studentId: 'student-1', status }],
    });

    it('exposes exactly the three submittable statuses', () => {
      expect(MARKABLE_ATTENDANCE_STATUSES).toEqual([
        'Present',
        'Absent',
        'Late',
      ]);
      expect(MARKABLE_ATTENDANCE_STATUSES).not.toContain('NotMarked');
    });

    it.each(['Present', 'Absent', 'Late'])('accepts %s', async (status) => {
      expect(await errorsFor(MarkAttendanceDto, entry(status))).toEqual([]);
    });

    it('rejects NotMarked, which is a system-only sentinel', async () => {
      // The seeding cron creates rows with no status, which defaults to
      // NotMarked. A client declaring it would also get markedById/markedAt
      // stamped, making an unmarked row read as locked and teacher-attributed.
      const errors = await errorsFor(MarkAttendanceDto, entry('NotMarked'));
      expect(errors).toContain('entries');
    });

    it('rejects an unknown status', async () => {
      expect(
        await errorsFor(MarkAttendanceDto, entry('Present-ish')),
      ).not.toEqual([]);
    });

    it('still reports NotMarked as a valid enum member on the generated type', () => {
      // Guards against someone "fixing" this by narrowing the Prisma enum, which
      // would break the cron seeding path and the status:{not:'NotMarked'} reads.
      expect(AttendanceStatus.NotMarked).toBe('NotMarked');
      expect(Object.values(AttendanceStatus)).toContain('NotMarked');
    });
  });
});
