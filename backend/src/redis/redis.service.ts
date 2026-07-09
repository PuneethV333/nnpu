import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import { Redis } from 'ioredis';
import { LoggerService } from '@/logger/logger.service';

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {
    this.redis.on('error', (err) => this.logger.error(err.message));
    this.redis.on('connect', () => this.logger.log('Redis connected'));
  }
  async get<T>(key: string): Promise<T | null> {
    const val = await this.redis.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600) {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result > 0;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
