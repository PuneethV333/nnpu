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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        // JWT_EXPIRES_IN: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
        PORT: Joi.number().default(5000),
        NODE_ENV: Joi.string().required(),
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
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
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
