import { Module } from '@nestjs/common';
import { MarksService } from './marks.service';
import { MarksController } from './marks.controller';
import { AuthModule } from '@/auth/auth.module';
import { LoggerModule } from '@/logger/logger.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [AuthModule, LoggerModule, PrismaModule],
  controllers: [MarksController],
  providers: [MarksService],
})
export class MarksModule {}
