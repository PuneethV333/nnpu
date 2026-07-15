import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { LoggerModule } from '@/logger/logger.module';
import { RedisModule } from '@/redis/redis.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [LoggerModule, RedisModule, PrismaModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
