import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ReportCardService {
  constructor(
    @InjectQueue('report-card') private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async requestReportCard(studentId: string, academicYearId: string) {
    this.logger.log('[report-card] requested');

    const existing = await this.prisma.reportCard.findUnique({
      where: { studentId_academicYearId: { studentId, academicYearId } },
    });

    if (existing?.status === 'Ready') {
      return { message: 'Report card already generated', reportCard: existing };
    }

    if (existing?.status === 'Processing') {
      return {
        message: 'Report card is already being generated',
        reportCard: existing,
      };
    }

    const reportCard = await this.prisma.reportCard.upsert({
      where: { studentId_academicYearId: { studentId, academicYearId } },
      update: { status: 'Pending', failureReason: null },
      create: { studentId, academicYearId, status: 'Pending' },
    });

    await this.queue.add('generate', {
      reportCardId: reportCard.id,
      studentId,
      academicYearId,
    });

    return { message: 'Report card generation queued', reportCard };
  }

  async getStatus(studentId: string, academicYearId: string) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: { studentId_academicYearId: { studentId, academicYearId } },
    });

    if (!reportCard) {
      throw new BadRequestException(
        'No report card requested yet for this year',
      );
    }

    return reportCard;
  }
}
