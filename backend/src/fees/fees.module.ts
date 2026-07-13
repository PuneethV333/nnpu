import { Module } from '@nestjs/common';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { LoggerModule } from '@/logger/logger.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [LoggerModule, PrismaModule],
  controllers: [FeesController],
  providers: [FeesService, RazorpayService],
})
export class FeesModule {}
