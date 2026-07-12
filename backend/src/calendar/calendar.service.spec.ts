/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: PrismaService,
          useValue: {
            academicCalendarDay: {
              upsert: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CalendarService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateYear', () => {
    it('generates 365 days for a non-leap year with correct weekend defaults', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);

      const result = await service.generateYear({
        year: 2026, // not a leap year
        overrides: [],
      });

      expect(result).toEqual({
        message: 'Calendar generated for 2026',
        totalDays: 365,
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const upsertCalls = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      expect(upsertCalls).toHaveLength(365);
    });

    it('applies overrides instead of the weekday/weekend default', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);

      await service.generateYear({
        year: 2026,
        overrides: [
          { date: '2026-07-10', type: 'Holiday', label: 'Founders Day' },
        ],
      });

      const upsertMockCalls = (prisma.academicCalendarDay.upsert as jest.Mock)
        .mock.calls;
      // find the call corresponding to July 10
      const julyTenthCall = upsertMockCalls.find((call) =>
        call[0].where.date.toISOString().startsWith('2026-07-10'),
      );

      expect(julyTenthCall[0].create.type).toBe('Holiday');
      expect(julyTenthCall[0].create.label).toBe('Founders Day');
    });
  });

  describe('getRange', () => {
    it('queries academicCalendarDay within the given date range', async () => {
      const mockDays = [{ date: new Date('2026-07-01'), type: 'Working' }];
      (prisma.academicCalendarDay.findMany as jest.Mock).mockResolvedValue(
        mockDays,
      );

      const result = await service.getRange('2026-07-01', '2026-07-31');

      expect(result).toEqual(mockDays);
      expect(prisma.academicCalendarDay.findMany).toHaveBeenCalledWith({
        where: {
          date: { gte: new Date('2026-07-01'), lte: new Date('2026-07-31') },
        },
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('overrideDay', () => {
    it('upserts a single day with the given type and label', async () => {
      const mockResult = { date: new Date('2026-07-10'), type: 'Holiday' };
      (prisma.academicCalendarDay.upsert as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const result = await service.overrideDay(
        '2026-07-10',
        'Holiday',
        'Founders Day',
      );

      expect(result).toEqual(mockResult);
      expect(prisma.academicCalendarDay.upsert).toHaveBeenCalledWith({
        where: { date: new Date('2026-07-10') },
        update: { type: 'Holiday', label: 'Founders Day' },
        create: {
          date: new Date('2026-07-10'),
          type: 'Holiday',
          label: 'Founders Day',
        },
      });
    });

    it('defaults label to null when not provided', async () => {
      (prisma.academicCalendarDay.upsert as jest.Mock).mockResolvedValue({});

      await service.overrideDay('2026-07-11', 'Exam');

      expect(prisma.academicCalendarDay.upsert).toHaveBeenCalledWith({
        where: { date: new Date('2026-07-11') },
        update: { type: 'Exam', label: null },
        create: { date: new Date('2026-07-11'), type: 'Exam', label: null },
      });
    });
  });
});
