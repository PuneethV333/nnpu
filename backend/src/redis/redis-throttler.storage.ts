import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

// `ThrottlerStorageRecord` is not re-exported from the @nestjs/throttler
// package root, so derive it from the interface we implement instead of
// reaching into the package's dist/ folder.
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/**
 * Shared, atomic rate-limit storage for every API instance.
 *
 * The default Nest throttler storage is process-local. Using the existing
 * Redis connection means limits still apply correctly after a restart or when
 * the API is scaled to multiple instances.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private static readonly incrementScript = `
    local counterKey = KEYS[1]
    local blockKey = KEYS[2]
    local ttl = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local blockDuration = tonumber(ARGV[3])

    if redis.call('EXISTS', blockKey) == 1 then
      return { tonumber(redis.call('GET', counterKey) or '0'), redis.call('PTTL', counterKey), 1, redis.call('PTTL', blockKey) }
    end

    local totalHits = redis.call('INCR', counterKey)
    if totalHits == 1 then
      redis.call('PEXPIRE', counterKey, ttl)
    end

    local timeToExpire = redis.call('PTTL', counterKey)
    if totalHits > limit then
      redis.call('SET', blockKey, '1', 'PX', blockDuration)
      return { totalHits, timeToExpire, 1, blockDuration }
    end

    return { totalHits, timeToExpire, 0, 0 }
  `;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] =
      (await this.redis.eval(
        RedisThrottlerStorage.incrementScript,
        2,
        key,
        `${key}:blocked`,
        ttl,
        limit,
        blockDuration,
      )) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: this.toSeconds(timeToExpire),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: this.toSeconds(timeToBlockExpire),
    };
  }

  private toSeconds(milliseconds: number): number {
    return milliseconds > 0 ? Math.ceil(milliseconds / 1000) : 0;
  }
}
