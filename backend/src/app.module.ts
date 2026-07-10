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
      }),
    }),
    // UsersModule, AuthModule,
    AuthModule,
    RedisModule,
    LoggerModule,
    PrismaModule,
    CalendarModule,
    // ... other feature modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
