import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { LoggerService } from '@/logger/logger.service';
import { REDIS_CLIENT } from './redis.constants';

describe('RedisService outage behaviour', () => {
  let service: RedisService;
  let client: Record<string, jest.Mock>;

  beforeEach(async () => {
    client = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
      scan: jest.fn(),
      on: jest.fn(),
      quit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: REDIS_CLIENT, useValue: client },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RedisService);
  });

  describe('cache operations are fail-soft', () => {
    it('get returns null on an outage instead of throwing', async () => {
      client.get.mockRejectedValue(new Error('ECONNREFUSED'));

      // A cache read must not become a 500 across every screen that uses one.
      await expect(service.get('any:key')).resolves.toBeNull();
    });

    it('set, del, incr, expire and delPattern all swallow an outage', async () => {
      const boom = new Error('ECONNREFUSED');
      client.set.mockRejectedValue(boom);
      client.del.mockRejectedValue(boom);
      client.incr.mockRejectedValue(boom);
      client.expire.mockRejectedValue(boom);
      client.scan.mockRejectedValue(boom);

      await expect(service.set('k', { a: 1 }, 60)).resolves.toBeUndefined();
      await expect(service.del('k')).resolves.toBe(false);
      // 0 keeps the login lockout failing open, which is the existing decision:
      // an unreachable cache must not lock the whole school out.
      await expect(service.incr('k')).resolves.toBe(0);
      await expect(service.expire('k', 60)).resolves.toBeUndefined();
      await expect(service.delPattern('k:*')).resolves.toBe(0);
    });

    it('still returns real values when Redis is healthy', async () => {
      client.get.mockResolvedValue(JSON.stringify({ name: 'Asha' }));

      await expect(service.get('k')).resolves.toEqual({ name: 'Asha' });
      await expect(service.del('k')).resolves.toBe(true);
    });
  });

  describe('getStrict stays strict for token revocation', () => {
    it('propagates an outage so the guard can answer 503', async () => {
      client.get.mockRejectedValue(new Error('ECONNREFUSED'));

      // If this returned null, JwtAuthGuard would read it as "not revoked" and
      // fail OPEN — honouring revoked tokens for as long as Redis is down.
      await expect(service.getStrict('blacklist:jti-1')).rejects.toThrow(
        'ECONNREFUSED',
      );
    });

    it('distinguishes a genuine miss from an outage', async () => {
      client.get.mockResolvedValue(null);
      await expect(service.getStrict('blacklist:jti-1')).resolves.toBeNull();
    });

    it('returns the value when the key is present', async () => {
      client.get.mockResolvedValue(JSON.stringify(true));
      await expect(service.getStrict('blacklist:jti-1')).resolves.toBe(true);
    });
  });
});
