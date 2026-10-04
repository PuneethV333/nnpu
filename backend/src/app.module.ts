import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { CalendarModule } from './calendar/calendar.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationModule } from './notification/notification.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { FirebaseModule } from './firebase/firebase.module';
import { MarksModule } from './marks/marks.module';
import { FeesModule } from './fees/fees.module';
// import { ReportCardModule } from './report-card/report-card.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { TimeTableModule } from './time-table/time-table.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { GoogleModule } from './google/google.module';
import { MailModule } from './mail/mail.module';
import { SectionsModule } from './sections/sections.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        // A short or absent signing key silently weakens every JWT. The local
        // secret is 86 chars, so a floor of 32 costs nothing and catches a
        // truncated or placeholder value at boot rather than in production.
        JWT_SECRET: Joi.string().min(32).required(),
        // JWT_EXPIRES_IN: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
        PORT: Joi.number().default(5000),
        // Was `.required()` with no constraint, so a typo like NODE_ENV=prod or
        // NODE_ENV=Production silently behaved as development. `dev` is accepted
        // because that is what local .env files use.
        NODE_ENV: Joi.string()
          .valid('development', 'dev', 'test', 'production')
          .required(),
        REDIS_URL: Joi.string().required(),
        FIREBASE_PROJECT_ID: Joi.string().required(),
        FIREBASE_CLIENT_EMAIL: Joi.string().required(),
        FIREBASE_PRIVATE_KEY: Joi.string().required(),
        RAZORPAY_KEY_ID: Joi.string().required(),
        RAZORPAY_KEY_SECRET: Joi.string().required(),
        RAZORPAY_WEBHOOK_SECRET: Joi.string().optional(),
        CORS_ORIGINS: Joi.string().optional(),
        CLIENT_ID: Joi.string().optional(),
        CLIENT_SECRET: Joi.string().optional(),
        REFRESH_TOKEN: Joi.string().optional(),
        ACCESS_TOKEN: Joi.string().optional(),
        SMTP_HOST: Joi.string().optional(),
        SMTP_PORT: Joi.number().optional(),
        SMTP_SECURE: Joi.string().optional(),
        SMTP_USER: Joi.string().optional(),
        SMTP_PASS: Joi.string().optional(),
        SMTP_FROM: Joi.string().optional(),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        // 100 requests/minute is deliberately generous for normal app use.
        // Sensitive routes retain their tighter @Throttle() overrides.
        //
        // Uses Nest's default in-memory storage. The previous Redis-backed
        // storage only bought cross-instance sharing, which a single-instance
        // deploy does not need, while putting a Lua EVAL on every request and
        // making the whole API fail if Redis was unreachable. If the API is
        // ever scaled horizontally, switch `storage` back to a shared store.
        ttl: 60_000,
        limit: 100,
        blockDuration: 60_000,
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    RedisModule,
    LoggerModule,
    PrismaModule,
    CalendarModule,
    AttendanceModule,
    NotificationModule,
    FirebaseModule,
    MarksModule,
    FeesModule,
    // ReportCardModule,
    OnboardingModule,
    AnnouncementModule,
    TimeTableModule,
    EnrollmentModule,
    GoogleModule,
    MailModule,
    SectionsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
