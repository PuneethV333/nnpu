/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
    user: { id: 'user-1', role: 'Student', isActive: true },
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
              findMany: jest.fn(),
            },
            sectionSubject: {
              findFirst: jest.fn(),
            },
            // FIX: was missing entirely — issueTokens()/changePassword() need this
            refreshToken: {
              create: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              findUnique: jest.fn(),
            },
            // refresh() claims the token inside a transaction; per AGENTS.md
            // $transaction is mocked as jest.fn((callback) => callback(tx)).
            $transaction: jest.fn(),
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
            // incr/expire back the per-auth-id login lockout.
            incr: jest.fn(),
            expire: jest.fn(),
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

    // Default transaction behaviour: run the callback against the same mock, and
    // report one row claimed so refresh() proceeds.
    (prisma.$transaction as jest.Mock).mockImplementation(
      (cb: (tx: unknown) => unknown) => cb(prisma),
    );
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('throws UnauthorizedException if authId does not exist', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ authId: 'nope', password: 'whatever' }),
      ).rejects.toThrow('Invalid auth id or password');
    });

    it('throws UnauthorizedException if password does not match', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ authId: mockAuth.authId, password: 'wrong' }),
      ).rejects.toThrow('Invalid auth id or password');

      // The deactivation guard runs before the password check, so a wrong
      // password must not be reported as a deactivated account.
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('reports a deactivated account with the same message as a bad password', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        ...mockAuth,
        user: { ...mockAuth.user, isActive: false },
      });

      await expect(
        service.login({ authId: mockAuth.authId, password: 'correct' }),
      ).rejects.toThrow('Invalid auth id or password');

      // Deliberately no longer says "This account has been deactivated": that
      // told anyone who guessed a valid auth id that the account existed.
      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('uses the same message for an unknown auth id as for a wrong password', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ authId: 'does-not-exist', password: 'whatever' }),
      ).rejects.toThrow('Invalid auth id or password');
    });

    it('still runs bcrypt on the unknown-auth-id path', async () => {
      // Otherwise response time alone reveals which auth ids exist.
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ authId: 'does-not-exist', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('returns an accessToken, refreshToken, and user on successful login', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');
      (jwtService.signAsync as jest.Mock).mockResolvedValue('signed-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.login({
        authId: mockAuth.authId,
        password: 'correct',
      });

      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: expect.any(String),
        user: { id: mockAuth.user.id, role: mockAuth.user.role },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          authId: mockAuth.authId,
          role: mockAuth.user.role,
          tokenVersion: mockAuth.tokenVersion,
        }),
      );
      expect(prisma.refreshToken.create).toHaveBeenCalled();
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
      const fullUser = {
        id: 'user-1',
        role: 'Student',
        isActive: true,
        details: { name: 'Test', profilePic: null, email: 'test@test.com' },
        section: {
          name: 'A',
          session: 'SCI-A',
          class: { name: 'I PUC' },
          classTeacher: { details: { name: 'Teacher' } },
        },
        teachingSubjects: [],
        classTeacherOf: null,
        combination: { name: 'PCMB', stream: 'Science' },
        language: 'Kannada',
        school: {
          name: 'School',
          noOfStudents: 0,
          noOfTeacher: 0,
          noOfBoys: 0,
          noOfGirls: 0,
        },
      };
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(fullUser);

      const expectedProfile = {
        id: 'user-1',
        role: 'Student',
        isActive: true,
        details: { name: 'Test', profilePic: null, email: 'test@test.com' },
        school: { name: 'School' },
        section: {
          name: 'A',
          session: 'SCI-A',
          class: { name: 'I PUC' },
          classTeacher: { details: { name: 'Teacher' } },
        },
        combination: { name: 'PCMB', stream: 'Science' },
        language: 'Kannada',
        teachingSubjects: [],
        classTeacherOf: null,
      };

      const result = await service.getMe(mockAuth.authId);

      expect(result).toEqual({ source: 'db', data: expectedProfile });
      expect(redis.set).toHaveBeenCalledWith(
        `me:${mockAuth.authId}`,
        expectedProfile,
        300,
      );
    });
  });

  describe('logOut', () => {
    it('blacklists the token for the remaining ttl', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const exp = nowInSeconds + 600;

      const result = await service.logOut(mockAuth.authId, 'some-jti', exp);

      expect(redis.set).toHaveBeenCalledWith(
        'blacklist:some-jti',
        true,
        expect.any(Number),
      );
      expect(result).toEqual({ message: 'Logged out successful' });
    });

    it('revokes the 30-day refresh tokens, not just the access token', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);

      await service.logOut(mockAuth.authId, 'some-jti', nowInSeconds + 600);

      // Without this, "logout" left a usable refresh token behind.
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { authId: mockAuth.authId },
      });
    });

    it('clears the cached profile', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);

      await service.logOut(mockAuth.authId, 'some-jti', nowInSeconds + 600);

      expect(redis.del).toHaveBeenCalledWith(`me:${mockAuth.authId}`);
    });

    it('revokes refresh tokens even when the access token already expired', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);

      await service.logOut(mockAuth.authId, 'some-jti', nowInSeconds - 10);

      expect(redis.set).not.toHaveBeenCalled();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { authId: mockAuth.authId },
      });
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

    it('updates password, revokes old refresh tokens, and returns a new token pair', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      (prisma.auth.update as jest.Mock).mockResolvedValue({
        ...mockAuth,
        password: 'new-hashed-password',
        tokenVersion: 1,
      });
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
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
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { authId: mockAuth.authId },
      });
      expect(redis.del).toHaveBeenCalledWith(`me:${mockAuth.authId}`);
      expect(result).toEqual({
        message: 'Password changed successfully.',
        accessToken: 'new-token',
        refreshToken: expect.any(String),
        user: { id: mockAuth.user.id, role: mockAuth.user.role },
      });
    });
  });

  describe('refresh', () => {
    const mockRefreshRecord = {
      tokenId: 'token-1',
      tokenHash: 'hashed-secret',
      authId: mockAuth.authId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1hr from now
      auth: {
        authId: mockAuth.authId,
        tokenVersion: 0,
        user: { id: 'user-1', role: 'Student', isActive: true },
      },
    };

    it('throws UnauthorizedException if refreshToken is malformed (no dot)', async () => {
      await expect(
        service.refresh({ refreshToken: 'not-a-valid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if refreshToken has too many parts', async () => {
      await expect(service.refresh({ refreshToken: 'a.b.c' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if tokenId is not found', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: 'token-1.some-secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if token is expired', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...mockRefreshRecord,
        expiresAt: new Date(Date.now() - 1000), // already expired
      });

      await expect(
        service.refresh({ refreshToken: 'token-1.some-secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if secret does not match hash', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        mockRefreshRecord,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refresh({ refreshToken: 'token-1.wrong-secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a new token pair and deletes the old refresh token on success', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        mockRefreshRecord,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-secret');
      (jwtService.signAsync as jest.Mock).mockResolvedValue('new-access-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      const result = await service.refresh({
        refreshToken: 'token-1.correct-secret',
      });

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: expect.any(String),
      });
      // Claims the token with deleteMany (the atomic gate) rather than delete,
      // so a concurrent refresh of the same token cannot both proceed.
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenId: 'token-1' },
      });
      expect(prisma.refreshToken.delete).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });
  describe('getAllStudents authorization', () => {
    const asAdmin = () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        authId: 'admin-auth',
        userId: 'admin-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'Admin',
      });
    };

    const asTeacher = () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        authId: 'teacher-auth',
        userId: 'teacher-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'Teacher',
      });
    };

    it('rejects a teacher who is not assigned to that section', async () => {
      // Regression: only role gating existed, so any teacher could pass any
      // sectionId and read that section roster.
      asTeacher();
      (prisma.sectionSubject.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getAllStudents('section-9', 'teacher-auth'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('allows a teacher assigned to the section', async () => {
      asTeacher();
      (prisma.sectionSubject.findFirst as jest.Mock).mockResolvedValue({
        id: 'ss-1',
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'student-1', details: { name: 'A' } },
      ]);

      await expect(
        service.getAllStudents('section-1', 'teacher-auth'),
      ).resolves.toEqual([{ id: 'student-1', name: 'A' }]);
    });

    it('lets an Admin list any section without an assignment check', async () => {
      asAdmin();
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.getAllStudents('section-1', 'admin-auth'),
      ).resolves.toEqual([]);

      expect(prisma.sectionSubject.findFirst).not.toHaveBeenCalled();
    });

    it('always filters by the requested section and active students', async () => {
      asAdmin();
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAllStudents('section-1', 'admin-auth');

      // Guards the original bug shape: an undefined sectionId would drop this
      // filter and return the whole school.
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sectionId: 'section-1' }),
        }),
      );
    });
  });
  describe('per-auth-id login lockout', () => {
    const asRealUser = () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    };

    it('locks the account after repeated failures', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (redis.get as jest.Mock).mockResolvedValue(5);
      (redis.incr as jest.Mock).mockResolvedValue(1);

      await expect(
        service.login({ authId: mockAuth.authId, password: 'wrong' }),
      ).rejects.toMatchObject({ status: 429 });

      // Must not even reach the credential check once locked.
      expect(prisma.auth.findUnique).not.toHaveBeenCalled();
    });

    it('records each failure against the auth id, not the IP', async () => {
      // Regression: the route throttle was keyed on IP at 5/min, so a school
      // behind one NAT locked each other out.
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (redis.get as jest.Mock).mockResolvedValue(0);
      (redis.incr as jest.Mock).mockResolvedValue(1);

      await service
        .login({ authId: mockAuth.authId, password: 'wrong' })
        .catch(() => undefined);

      expect(redis.incr).toHaveBeenCalledWith(
        `login:fail:${mockAuth.authId.toLowerCase()}`,
      );
    });

    it('sets the lock TTL only on the first failure', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (redis.get as jest.Mock).mockResolvedValue(0);
      (redis.incr as jest.Mock).mockResolvedValue(3);

      await service
        .login({ authId: mockAuth.authId, password: 'wrong' })
        .catch(() => undefined);

      expect(redis.expire).not.toHaveBeenCalled();
    });

    it('clears the counter after a successful login', async () => {
      asRealUser();
      (redis.get as jest.Mock).mockResolvedValue(0);

      await service.login({ authId: mockAuth.authId, password: 'correct' });

      expect(redis.del).toHaveBeenCalledWith(
        `login:fail:${mockAuth.authId.toLowerCase()}`,
      );
    });

    it('fails open when Redis is unavailable', async () => {
      // An infrastructure outage must not stop the school logging in.
      asRealUser();
      (redis.get as jest.Mock).mockRejectedValue(new Error('redis down'));
      (redis.incr as jest.Mock).mockRejectedValue(new Error('redis down'));
      (redis.del as jest.Mock).mockRejectedValue(new Error('redis down'));

      await expect(
        service.login({ authId: mockAuth.authId, password: 'correct' }),
      ).resolves.toHaveProperty('accessToken');
    });
  });

  describe('refresh atomicity', () => {
    const activeRefresh = {
      tokenId: 'token-1',
      tokenHash: 'hashed-secret',
      authId: mockAuth.authId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      auth: {
        authId: mockAuth.authId,
        tokenVersion: 0,
        user: { id: 'user-1', role: 'Student', isActive: true },
      },
    };

    it('rejects a second use of the same refresh token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        activeRefresh,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      // Simulates the loser's claim: the row is already gone.
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await expect(
        service.refresh({ refreshToken: 'token-1.secret' }),
      ).rejects.toThrow('Invalid refresh token');

      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects a refresh for a deactivated user', async () => {
      // Regression: no isActive check, so a deactivated account could keep
      // minting pairs from a token issued before deactivation.
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        ...activeRefresh,
        auth: {
          ...activeRefresh.auth,
          user: { ...activeRefresh.auth.user, isActive: false },
        },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.refresh({ refreshToken: 'token-1.secret' }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('purges the user expired refresh tokens while claiming', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        activeRefresh,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.refresh({ refreshToken: 'token-1.secret' });

      // Expired rows were never cleaned up, so they accumulated indefinitely.
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          authId: mockAuth.authId,
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});
