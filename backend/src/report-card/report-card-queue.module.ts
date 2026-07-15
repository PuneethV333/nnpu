// report-card/report-card-queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: new URL(config.get<string>('REDIS_URL')!).hostname,
          port: Number(new URL(config.get<string>('REDIS_URL')!).port),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'report-card' }),
  ],
  exports: [BullModule],
})
export class ReportCardQueueModule {}
