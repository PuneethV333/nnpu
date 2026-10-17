import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { LoggerModule } from '@/logger/logger.module';
import { RedisModule } from '@/redis/redis.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { MailModule } from '@/mail/mail.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  // MailModule for the credentials a created teacher is sent.
  imports: [LoggerModule, RedisModule, PrismaModule, AuthModule, MailModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
