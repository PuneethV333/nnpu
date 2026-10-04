import { Test, TestingModule } from '@nestjs/testing';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RedisService } from '@/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';

const PAYLOAD = {
  authId: 'nnpu1SB26KA001',
  userId: 'user-1',
  jti: 'jti-1',
  tokenVersion: 0,
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: { verifyAsync: jest.Mock };
  let redis: { get: jest.Mock };
  let prisma: { auth: { findUnique: jest.Mock } };

  const ctx = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authorization ? { authorization } : {},
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    jwt = { verifyAsync: jest.fn().mockResolvedValue(PAYLOAD) };
    redis = { get: jest.fn().mockResolvedValue(null) };
    prisma = {
      auth: {
        findUnique: jest.fn().mockResolvedValue({
          tokenVersion: 0,
          user: { isActive: true },
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwt },
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: prisma },
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

    guard = module.get(JwtAuthGuard);
  });

  it('rejects a missing Authorization header', async () => {
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows a valid, non-revoked, active token', async () => {
    await expect(guard.canActivate(ctx('Bearer good-token'))).resolves.toBe(
      true,
    );
  });

  describe('failure modes are no longer collapsed into one 401', () => {
    it('reports an invalid signature as "Invalid or expired token"', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(guard.canActivate(ctx('Bearer bad-token'))).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('surfaces revocation with its own message, not the generic one', async () => {
      redis.get.mockResolvedValue(true);

      // This used to be swallowed by the catch-all and reported as
      // "Invalid or expired token".
      await expect(
        guard.canActivate(ctx('Bearer revoked-token')),
      ).rejects.toThrow('Token has been revoked');
    });

    it('rejects a deactivated account with the revocation message', async () => {
      prisma.auth.findUnique.mockResolvedValue({
        tokenVersion: 0,
        user: { isActive: false },
      });

      await expect(
        guard.canActivate(ctx('Bearer deactivated')),
      ).rejects.toThrow('Token has been revoked');
    });

    it('rejects a stale tokenVersion', async () => {
      prisma.auth.findUnique.mockResolvedValue({
        tokenVersion: 5,
        user: { isActive: true },
      });

      await expect(guard.canActivate(ctx('Bearer stale'))).rejects.toThrow(
        'Token has been revoked',
      );
    });
  });

  describe('dependency outages are not disguised as auth failures', () => {
    it('returns 503, not 401, when Redis is unreachable', async () => {
      // Regression: a Redis error hit the catch-all and became
      // "Invalid or expired token", logging out every user during an outage.
      redis.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        guard.canActivate(ctx('Bearer valid-token')),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('does not treat a Redis outage as a revoked token', async () => {
      redis.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        guard.canActivate(ctx('Bearer valid-token')),
      ).rejects.not.toThrow('Token has been revoked');
    });

    it('propagates a Postgres failure instead of returning 401', async () => {
      prisma.auth.findUnique.mockRejectedValue(new Error('DB down'));

      await expect(
        guard.canActivate(ctx('Bearer valid-token')),
      ).rejects.toThrow('DB down');
    });
  });
});
