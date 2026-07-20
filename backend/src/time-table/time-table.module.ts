import { Module } from '@nestjs/common';
import { TimeTableController } from './time-table.controller';
import { TimetableService } from './time-table.service';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TimeTableController],
  providers: [TimetableService],
})
export class TimeTableModule {}
