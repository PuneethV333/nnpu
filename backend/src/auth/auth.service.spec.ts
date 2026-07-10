/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { LoggerService } from '@/logger/logger.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let redis: jest.Mocked<RedisService>;

  const mockAuth = {
    id: 'auth-1',
    authId: 'nnpu1sb26ka1',
    password: 'hashed-password',
    userId: 'user-1',
    tokenVersion: 0,
    user: { id: 'user-1', role: 'Student' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            auth: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
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

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    redis = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('throws UnauthorizedException if authId does not exist', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ authId: 'nope', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if password does not match', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ authId: mockAuth.authId, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns an accessToken and user on successful login', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('signed-token');

      const result = await service.login({
        authId: mockAuth.authId,
        password: 'correct',
      });

      expect(result).toEqual({
        accessToken: 'signed-token',
        user: { id: mockAuth.user.id, role: mockAuth.user.role },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          authId: mockAuth.authId,
          role: mockAuth.user.role,
          tokenVersion: mockAuth.tokenVersion,
        }),
      );
    });
  });

  describe('getMe', () => {
    it('returns cached data if present, without hitting the DB', async () => {
      const cachedUser = { id: 'user-1', role: 'Student' };
      (redis.get as jest.Mock).mockResolvedValue(cachedUser);

      const result = await service.getMe(mockAuth.authId);

      expect(result).toEqual({ source: 'redis', data: cachedUser });
      expect(prisma.auth.findUnique).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException if auth record not found', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe('missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if user record not found', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe(mockAuth.authId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('fetches from DB and caches the result on a cache miss', async () => {
      const fullUser = { id: 'user-1', role: 'Student', details: {} };
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(fullUser);

      const result = await service.getMe(mockAuth.authId);

      expect(result).toEqual({ source: 'db', data: fullUser });
      expect(redis.set).toHaveBeenCalledWith(
        `me:${mockAuth.authId}`,
        fullUser,
        300,
      );
    });
  });

  describe('logOut', () => {
    it('blacklists the token for the remaining ttl', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const exp = nowInSeconds + 600; // 10 min left

      const result = await service.logOut('some-jti', exp);

      expect(redis.set).toHaveBeenCalledWith(
        'blacklist:some-jti',
        true,
        expect.any(Number),
      );
      expect(result).toEqual({ message: 'Logged out successful' });
    });

    it('does not blacklist if the token is already expired', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const exp = nowInSeconds - 10; // already expired

      await service.logOut('some-jti', exp);

      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('throws UnauthorizedException if user not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword(mockAuth.authId, {
          oldPassWord: 'x',
          newPassWord: 'y',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if old password is incorrect', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(mockAuth.authId, {
          oldPassWord: 'wrong',
          newPassWord: 'newPass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates password, increments tokenVersion, and returns a new token', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      (prisma.auth.update as jest.Mock).mockResolvedValue({
        ...mockAuth,
        password: 'new-hashed-password',
        tokenVersion: 1,
      });
      (jwtService.signAsync as jest.Mock).mockResolvedValue('new-token');

      const result = await service.changePassword(mockAuth.authId, {
        oldPassWord: 'correct',
        newPassWord: 'newpass',
      });

      expect(prisma.auth.update).toHaveBeenCalledWith({
        where: { authId: mockAuth.authId },
        data: {
          password: 'new-hashed-password',
          tokenVersion: { increment: 1 },
        },
      });
      expect(redis.del).toHaveBeenCalledWith(`me:${mockAuth.authId}`);
      expect(result).toEqual({
        message: 'Password changed successfully.',
        accessToken: 'new-token',
        user: { id: mockAuth.user.id, role: mockAuth.user.role },
      });
    });
  });
});
