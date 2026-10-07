// enrollment.module.ts
import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { PromotionService } from './promotion.service';
import { EnrollmentController } from './enrollment.controller';
import { MailModule } from '@/mail/mail.module';
import { AuthModule } from '@/auth/auth.module';
import { RedisModule } from '@/redis/redis.module';

@Module({
  // MailModule for the credential emails, RedisModule to invalidate the cached
  // attendance roster after an import or a promotion, AuthModule for the
  // JwtAuthGuard/RolesGuard the controller relies on.
  imports: [MailModule, AuthModule, RedisModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, PromotionService],
})
export class EnrollmentModule {}
