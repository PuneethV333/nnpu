// enrollment.module.ts
import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { MailModule } from '@/mail/mail.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  // MailModule is required for the credential emails; AuthModule for the
  // JwtAuthGuard/RolesGuard the controller relies on.
  imports: [MailModule, AuthModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
