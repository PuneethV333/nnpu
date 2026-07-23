// enrollment/corn/enrollment-promote.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { EnrollmentService } from '../enrollment.service';

@Injectable()
export class EnrollmentPromoteCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    const closedDrives = await this.prisma.enrollmentDrive.findMany({
      where: { status: 'Closed' },
    });

    for (const drive of closedDrives) {
      this.logger.log(`[enrollment-promote-cron] promoting drive ${drive.id}`);
      const result = await this.enrollmentService.triggerPromotionForDrive(
        drive.id,
      );
      this.logger.log(
        `[enrollment-promote-cron] drive ${drive.id}: promoted ${result.promoted}, failed ${result.failed}`,
      );
    }
  }
}
