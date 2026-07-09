import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from '@/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisModule => {
        return new Redis(config.get<string>('REDIS_URL') as string, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
          reconnectOnError: (err) => {
            return err.message.includes('READONLY');
          },
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
