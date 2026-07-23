// enrollment.module.ts
import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { GoogleModule } from '@/google/google.module';
import { MailModule } from '@/mail/mail.module';
import { EnrollmentCloseCron } from './corn/enrollment-close.cron';
import { EnrollmentPromoteCron } from './corn/enrollment-promote.cron';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [GoogleModule, MailModule, AuthModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EnrollmentCloseCron, EnrollmentPromoteCron],
})
export class EnrollmentModule {}
