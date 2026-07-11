import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { LoggerModule } from '@/logger/logger.module';
import { RedisModule } from '@/redis/redis.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, LoggerModule, RedisModule, AuthModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
