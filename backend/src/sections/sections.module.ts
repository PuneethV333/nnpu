import { Module } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { LoggerModule } from '@/logger/logger.module';

@Module({
  imports: [PrismaModule, AuthModule, LoggerModule],
  controllers: [SectionsController],
  providers: [SectionsService],
})
export class SectionsModule {}
