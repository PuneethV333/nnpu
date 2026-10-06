import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import { Redis } from 'ioredis';
import { LoggerService } from '@/logger/logger.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {
    this.redis.on('error', (err) => this.logger.error(err.message));
    this.redis.on('connect', () => this.logger.log('Redis connected'));
  }
  /**
   * Runs a cache operation, swallowing a Redis outage.
   *
   * Every method below is a *cache* operation: a miss and an unreachable cache
   * are the same thing to a caller that can recompute from Postgres. Failing hard
   * turned a cache outage into a wave of 500s across every screen that reads
   * through the cache, which is the opposite of what a cache is for.
   *
   * `getStrict` is the deliberate exception — see its note.
   */
  private async safe<T>(
    op: string,
    fn: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.logger.warn(
        `[redis] ${op} failed, continuing without cache: ${(err as Error).message}`,
      );
      return fallback;
    }
  }

  /**
   * Cache read that yields `null` when Redis is unreachable.
   *
   * Note this makes "outage" indistinguishable from "miss" for cache callers,
   * which is correct for them but NOT for token revocation: `JwtAuthGuard` must
   * be able to tell the two apart, so it uses `getStrict`.
   */
  async get<T>(key: string): Promise<T | null> {
    return this.safe(
      'get',
      async () => {
        const val = await this.redis.get(key);
        if (!val) return null;
        try {
          return JSON.parse(val) as T;
        } catch {
          return null;
        }
      },
      null,
    );
  }

  /**
   * Cache read that propagates a Redis outage.
   *
   * Exists solely for `JwtAuthGuard.assertNotRevoked`. Treating an outage as
   * "not blacklisted" would fail open and honour revoked tokens; failing closed
   * with a 401 would log out the entire school on a cache blip. The guard needs
   * the error to answer 503 and let the client retry.
   */
  async getStrict<T>(key: string): Promise<T | null> {
    const val = await this.redis.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600) {
    await this.safe(
      'set',
      async () => {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
        return undefined;
      },
      undefined,
    );
  }

  /**
   * Atomic increment, used for attempt counters where a read-then-write would
   * lose counts under concurrency.
   *
   * Returns -1 when the key does not exist, matching ioredis, so callers can
   * apply a TTL only on first use.
   */
  async incr(key: string): Promise<number> {
    // 0 on outage. Only the login lockout uses this, and it already fails open
    // around these calls — an unreachable cache must not lock everyone out or
    // prevent them logging in.
    return this.safe('incr', () => this.redis.incr(key), 0);
  }

  /** Sets a TTL on a key that has no expiry yet. */
  async expire(key: string, ttl: number): Promise<void> {
    await this.safe(
      'expire',
      async () => {
        await this.redis.expire(key, ttl);
      },
      undefined,
    );
  }

  async del(key: string): Promise<boolean> {
    // false on outage: a stale entry self-heals on the next write or TTL expiry,
    // which is preferable to failing the request that triggered the delete.
    return this.safe('del', async () => (await this.redis.del(key)) > 0, false);
  }

  async delPattern(pattern: string): Promise<number> {
    return this.safe('delPattern', () => this.scanAndDelete(pattern), 0);
  }

  private async scanAndDelete(pattern: string): Promise<number> {
    let cursor = '0';
    let deleteCount = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
        deleteCount += keys.length;
      }
    } while (cursor !== '0');

    return deleteCount;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
