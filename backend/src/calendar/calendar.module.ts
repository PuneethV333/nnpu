import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { LoggerModule } from '@/logger/logger.module';
import { AuthModule } from '@/auth/auth.module';
import { RedisModule } from '@/redis/redis.module';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule, RedisModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
