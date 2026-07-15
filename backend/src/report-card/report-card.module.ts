import { Module } from '@nestjs/common';
import { ReportCardQueueModule } from './report-card-queue.module';
import { ReportCardService } from './report-card.service';
import { ReportCardProcessor } from './report-card.processor';
import { ReportCardController } from './report-card.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { LoggerModule } from '@/logger/logger.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [
    ReportCardQueueModule,
    PrismaModule,
    LoggerModule,
    NotificationModule,
  ],
  controllers: [ReportCardController],
  providers: [ReportCardService, ReportCardProcessor],
})
export class ReportCardModule {}
