import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { LoggerModule } from '@/logger/logger.module';

@Module({
  imports: [AuthModule, PrismaModule, LoggerModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
})
export class AnnouncementModule {}
