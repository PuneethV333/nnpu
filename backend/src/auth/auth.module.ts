import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RolesGuard } from './guard/roles.guard';
import { RedisModule } from '@/redis/redis.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { LoggerModule } from '@/logger/logger.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN') as StringValue,
        },
      }),
    }),
    RedisModule,
    PrismaModule,
    LoggerModule,
  ],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  controllers: [AuthController],
})
export class AuthModule {}
