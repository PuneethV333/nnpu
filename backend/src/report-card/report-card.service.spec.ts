import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ReportCardService } from './report-card.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';

describe('ReportCardService', () => {
  let service: ReportCardService;
  let queue: jest.Mocked<Pick<Queue, 'add'>>;
  let prisma: {
    reportCard: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let logger: jest.Mocked<Pick<LoggerService, 'log'>>;

  const studentId = 'student-1';
  const academicYearId = 'year-1';

  beforeEach(async () => {
    queue = { add: jest.fn() };
    prisma = {
      reportCard: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    logger = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCardService,
        { provide: getQueueToken('report-card'), useValue: queue },
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<ReportCardService>(ReportCardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestReportCard', () => {
    it('returns existing report card without queuing when already Ready', async () => {
      const existing = { id: 'rc-1', status: 'Ready' };
      prisma.reportCard.findUnique.mockResolvedValue(existing);

      const result = await service.requestReportCard(studentId, academicYearId);

      expect(result).toEqual({
        message: 'Report card already generated',
        reportCard: existing,
      });
      expect(queue.add).not.toHaveBeenCalled();
      expect(prisma.reportCard.upsert).not.toHaveBeenCalled();
    });

    it('returns existing report card without queuing when already Processing', async () => {
      const existing = { id: 'rc-1', status: 'Processing' };
      prisma.reportCard.findUnique.mockResolvedValue(existing);

      const result = await service.requestReportCard(studentId, academicYearId);

      expect(result).toEqual({
        message: 'Report card is already being generated',
        reportCard: existing,
      });
      expect(queue.add).not.toHaveBeenCalled();
      expect(prisma.reportCard.upsert).not.toHaveBeenCalled();
    });

    it('upserts to Pending and queues a job when none exists', async () => {
      prisma.reportCard.findUnique.mockResolvedValue(null);
      const upserted = { id: 'rc-2', status: 'Pending' };
      prisma.reportCard.upsert.mockResolvedValue(upserted);

      const result = await service.requestReportCard(studentId, academicYearId);

      expect(prisma.reportCard.upsert).toHaveBeenCalledWith({
        where: { studentId_academicYearId: { studentId, academicYearId } },
        update: { status: 'Pending', failureReason: null },
        create: { studentId, academicYearId, status: 'Pending' },
      });
      expect(queue.add).toHaveBeenCalledWith('generate', {
        reportCardId: upserted.id,
        studentId,
        academicYearId,
      });
      expect(result).toEqual({
        message: 'Report card generation queued',
        reportCard: upserted,
      });
    });

    it('re-queues when a previous attempt Failed', async () => {
      const existing = { id: 'rc-3', status: 'Failed' };
      prisma.reportCard.findUnique.mockResolvedValue(existing);
      const upserted = { id: 'rc-3', status: 'Pending' };
      prisma.reportCard.upsert.mockResolvedValue(upserted);

      const result = await service.requestReportCard(studentId, academicYearId);

      expect(prisma.reportCard.upsert).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalledWith('generate', {
        reportCardId: upserted.id,
        studentId,
        academicYearId,
      });
      expect(result.message).toBe('Report card generation queued');
    });
  });

  describe('getStatus', () => {
    it('returns the report card when found', async () => {
      const existing = { id: 'rc-1', status: 'Ready' };
      prisma.reportCard.findUnique.mockResolvedValue(existing);

      const result = await service.getStatus(studentId, academicYearId);

      expect(prisma.reportCard.findUnique).toHaveBeenCalledWith({
        where: { studentId_academicYearId: { studentId, academicYearId } },
      });
      expect(result).toEqual(existing);
    });

    it('throws BadRequestException when no report card exists', async () => {
      prisma.reportCard.findUnique.mockResolvedValue(null);

      await expect(
        service.getStatus(studentId, academicYearId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
