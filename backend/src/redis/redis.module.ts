import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisModule => {
        return new Redis(config.get<string>('REDIS_URL') as string);
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
