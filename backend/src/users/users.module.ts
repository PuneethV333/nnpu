import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { LoggerModule } from '@/logger/logger.module';
import { RedisModule } from '@/redis/redis.module';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [PrismaModule, AuthModule, LoggerModule, RedisModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
