import { PrismaService } from '@/prisma/prisma.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './types/jwt-payload.type';
import { RedisService } from '@/redis/redis.service';
import { randomBytes, randomUUID } from 'crypto';
import { changePasswordDto } from './dto/change-password.dto';
import { LoggerService } from '@/logger/logger.service';
import { addDays } from 'date-fns';
import { Role } from '@/generated/prisma';
import { login } from './types/get-me.type';
import { refreshDto } from './dto/refresh.dto';

/**
 * A real bcrypt hash of a value nobody knows. Compared against on the
 * "unknown auth id" path so every failed login costs the same wall-clock time.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$10$cCLaVdzsJrEZFTp5ftMRTO.06B5ppQsmtcs3GOan0qD3WrNEfsEwq';

/** Deliberately identical for every failure mode — see login(). */
const INVALID_CREDENTIALS = 'Invalid auth id or password';
const INVALID_REFRESH = 'Invalid refresh token';

const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_SECONDS = 300;

const loginFailureKey = (authId: string): string => `login:fail:${authId}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  private async issueTokens(
    authId: string,
    role: Role,
    tokenVersion: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      authId,
      role,
      jti: randomUUID(),
      tokenVersion,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const tokenId = randomUUID();
    const tokenSecret = randomBytes(64).toString('hex');
    const refreshToken = `${tokenId}.${tokenSecret}`;
    const tokenHash = await bcrypt.hash(tokenSecret, 10);

    await this.prisma.refreshToken.create({
      data: {
        tokenId,
        tokenHash,
        authId,
        expiresAt: addDays(new Date(), 30),
      },
    });

    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto): Promise<login> {
    this.logger.log('[auth]');

    // Normalised for the throttle key only; the lookup below stays exact so
    // existing mixed-case auth ids keep working.
    const throttleKey = dto.authId.trim().toLowerCase();

    await this.assertLoginNotLocked(throttleKey);

    const auth = await this.prisma.auth.findUnique({
      where: { authId: dto.authId },
      include: { user: true },
    });

    // Always pay the bcrypt cost, even when the auth id does not exist. The
    // miss path used to return immediately, so response time alone revealed
    // which auth ids were real.
    const storedHash = auth?.password ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(dto.password, storedHash);

    // One message for all three failures. Deactivating an account used to be
    // announced to whoever guessed its auth id.
    if (!auth || !passwordMatches || !auth.user.isActive) {
      await this.recordLoginFailure(throttleKey);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.clearLoginFailures(throttleKey);

    const { accessToken, refreshToken } = await this.issueTokens(
      auth.authId,
      auth.user.role,
      auth.tokenVersion,
    );

    return {
      accessToken,
      refreshToken,
      user: { id: auth.user.id, role: auth.user.role },
    };
  }

  /**
   * Per-auth-id lockout.
   *
   * The route throttle is keyed on IP by default, so a whole school behind one
   * NAT shared a single 5-per-minute budget and locked each other out at 8:30am.
   * Counting per auth id keeps the protection where it belongs — against
   * repeated attempts on one account — without punishing shared egress.
   *
   * Fails *open* if Redis is unavailable: an infrastructure outage must not stop
   * the school from logging in.
   */
  private async assertLoginNotLocked(throttleKey: string): Promise<void> {
    try {
      const attempts = Number(
        (await this.redis.get<number>(loginFailureKey(throttleKey))) ?? 0,
      );

      if (attempts >= LOGIN_MAX_FAILURES) {
        // Nest ships no TooManyRequestsException, so 429 is raised directly.
        throw new HttpException(
          'Too many failed login attempts. Try again in a few minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(`[auth] login lockout check skipped: ${String(err)}`);
    }
  }

  private async recordLoginFailure(throttleKey: string): Promise<void> {
    try {
      const key = loginFailureKey(throttleKey);
      const attempts = await this.redis.incr(key);

      if (attempts === 1) {
        await this.redis.expire(key, LOGIN_LOCK_SECONDS);
      }
    } catch (err) {
      this.logger.warn(`[auth] could not record login failure: ${String(err)}`);
    }
  }

  private async clearLoginFailures(throttleKey: string): Promise<void> {
    try {
      await this.redis.del(loginFailureKey(throttleKey));
    } catch (err) {
      this.logger.warn(`[auth] could not clear login failures: ${String(err)}`);
    }
  }

  async refresh(dto: refreshDto) {
    const part = dto.refreshToken.split('.');

    if (part.length !== 2) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    const [tokenId, tokenSecret] = part;

    const refresh = await this.prisma.refreshToken.findUnique({
      where: { tokenId },
      include: { auth: { include: { user: true } } },
    });

    if (!refresh) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    const valid = await bcrypt.compare(tokenSecret, refresh.tokenHash);
    if (!valid) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    if (refresh.expiresAt < new Date()) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    // A deactivated user could otherwise keep minting pairs from a token
    // issued before deactivation.
    if (!refresh.auth.user.isActive) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    // Claim the token *before* issuing a replacement. `deleteMany` is the
    // atomic gate: two concurrent refreshes both pass the checks above, but
    // only one sees count === 1, so exactly one pair is ever minted from a
    // given token. Previously the new pair was issued first and the old row
    // deleted afterwards, so a race produced two live pairs — and the loser's
    // `delete` then threw on an already-deleted row.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const res = await tx.refreshToken.deleteMany({ where: { tokenId } });

      // Opportunistic cleanup: rows only linger for abandoned logins, and this
      // keeps any given user's table from growing without a scheduled job.
      await tx.refreshToken.deleteMany({
        where: { authId: refresh.authId, expiresAt: { lt: new Date() } },
      });

      return res.count;
    });

    if (claimed === 0) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }

    // Issues tokens directly rather than routing through login(), so no real
    // password is ever needed here.
    return this.issueTokens(
      refresh.auth.authId,
      refresh.auth.user.role,
      refresh.auth.tokenVersion,
    );
  }

  /**
   * Live counts for the admin dashboard.
   *
   * Deliberately NOT read from `School.noOfStudents` / `noOfTeacher`: those
   * columns are only ever written by `prisma/dummy.ts`, so they froze at the
   * seed value and every enrolment, transfer or deactivation left them stale.
   * Counting is cheap here (two indexed counts on `schoolId`) and cannot drift.
   *
   * `noOfBoys` / `noOfGirls` are always null: `User` has no gender field, so
   * the seeded values were an invented even split. Returning null lets the
   * client omit those tiles instead of showing a fabricated 50/50.
   */
  private async schoolStats(schoolId: string) {
    const [noOfStudents, noOfTeacher] = await Promise.all([
      this.prisma.user.count({
        where: { schoolId, role: 'Student', isActive: true },
      }),
      this.prisma.user.count({
        where: { schoolId, role: 'Teacher', isActive: true },
      }),
    ]);

    return {
      noOfStudents,
      noOfTeacher,
      noOfBoys: null as number | null,
      noOfGirls: null as number | null,
    };
  }

  async getMe(authId: string) {
    this.logger.log('[get-me]');
    const cacheKey = `me:${authId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return { source: 'redis', data: cached };
    }

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        details: true,
        section: {
          include: {
            class: true,
            classTeacher: { include: { details: true } },
          },
        },
        teachingSubjects: {
          include: {
            subject: true,
            section: { include: { class: true } },
          },
        },
        classTeacherOf: { include: { class: true } },
        combination: true,
        school: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const profile = {
      id: user.id,
      role: user.role,
      isActive: user.isActive,
      details: user.details
        ? {
            name: user.details.name,
            profilePic: user.details.profilePic,
            email: user.details.email,
          }
        : null,
      school: user.school
        ? {
            name: user.school.name,
            ...(user.role === 'Admin' &&
              (await this.schoolStats(user.school.id))),
          }
        : null,
      section: user.section
        ? {
            name: user.section.name,
            session: user.section.session,
            class: user.section.class
              ? { name: user.section.class.name }
              : null,
            classTeacher: user.section.classTeacher
              ? {
                  details: user.section.classTeacher.details
                    ? { name: user.section.classTeacher.details.name }
                    : null,
                }
              : null,
          }
        : null,
      combination: user.combination
        ? {
            name: user.combination.name,
            stream: user.combination.stream,
          }
        : null,
      language: user.language,
      teachingSubjects: user.teachingSubjects.map((ts) => ({
        subject: { name: ts.subject.name },
        section: {
          name: ts.section.name,
          class: ts.section.class ? { name: ts.section.class.name } : null,
        },
      })),
      classTeacherOf: user.classTeacherOf
        ? {
            name: user.classTeacherOf.name,
            class: user.classTeacherOf.class
              ? { name: user.classTeacherOf.class.name }
              : null,
          }
        : null,
    };

    await this.redis.set(cacheKey, profile, 300);

    return { data: profile, source: 'db' };
  }

  async logOut(authId: string, jti: string, exp: number) {
    this.logger.warn('[logged-out]');
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ttl = exp - nowInSeconds;

    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, true, ttl);
    }

    // Blacklisting the access token alone was not a logout: refresh tokens live
    // for 30 days, so the caller could silently mint a fresh access token
    // straight after "logging out" and carry on indefinitely.
    await this.prisma.refreshToken.deleteMany({ where: { authId } });

    // Drop the cached profile so the next request cannot be served from a
    // pre-logout snapshot.
    await this.redis.del(`me:${authId}`);

    return { message: 'Logged out successful' };
  }

  async changePassword(authId: string, dto: changePasswordDto) {
    this.logger.verbose('[change-pass]');
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      include: { user: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const oldPasswordMatches = await bcrypt.compare(
      dto.oldPassWord,
      auth.password,
    );

    if (!oldPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassWord, 10);

    const updatedAuth = await this.prisma.auth.update({
      where: { authId },
      data: {
        password: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    // FIX: revoke all existing refresh tokens on password change,
    // otherwise a stolen refresh token still works after a password reset.
    await this.prisma.refreshToken.deleteMany({ where: { authId } });

    await this.redis.del(`me:${authId}`);

    const { accessToken, refreshToken } = await this.issueTokens(
      updatedAuth.authId,
      auth.user.role,
      updatedAuth.tokenVersion,
    );

    return {
      message: 'Password changed successfully.',
      accessToken,
      refreshToken,
      user: { id: auth.user.id, role: auth.user.role },
    };
  }

  async getStudentProfile(authId: string) {
    const auth = await this.prisma.auth.findUnique({ where: { authId } });
    if (!auth) throw new UnauthorizedException('user not found');

    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        role: true,
        language: true,
        details: { select: { name: true, profilePic: true } },
        school: { select: { name: true } },
        combination: { select: { name: true, stream: true } },
        section: {
          select: {
            name: true,
            class: { select: { name: true } },
            classTeacher: {
              select: { details: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('profile not found');
    return user;
  }

  async getTeacherProfile(authId: string) {
    const auth = await this.prisma.auth.findUnique({ where: { authId } });
    if (!auth) throw new UnauthorizedException('user not found');

    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        role: true,
        details: { select: { name: true, profilePic: true } },
        school: { select: { name: true } },
        teachingSubjects: {
          select: {
            subject: { select: { name: true } },
            section: {
              select: { name: true, class: { select: { name: true } } },
            },
          },
        },
        classTeacherOf: {
          select: { name: true, class: { select: { name: true } } },
        },
      },
    });

    if (!user) throw new NotFoundException('profile not found');
    return user;
  }

  async getAdminProfile(authId: string) {
    const auth = await this.prisma.auth.findUnique({ where: { authId } });
    if (!auth) throw new UnauthorizedException('user not found');

    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        role: true,
        details: { select: { name: true, profilePic: true } },
        school: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new NotFoundException('profile not found');

    return {
      role: user.role,
      details: user.details,
      school: user.school
        ? {
            name: user.school.name,
            ...(await this.schoolStats(user.school.id)),
          }
        : null,
    };
  }

  async getAllStudents(sectionId: string, authId: string) {
    const auth = await this.prisma.auth.findUnique({ where: { authId } });
    if (!auth) throw new UnauthorizedException('user not found');

    const role = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    // Role gating alone was not enough: any teacher could pass any sectionId and
    // read that section's roster. A teacher must be assigned to the section.
    if (role?.role !== 'Admin') {
      const assignment = await this.prisma.sectionSubject.findFirst({
        where: { sectionId, teacherId: auth.userId },
        select: { id: true },
      });

      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this section');
      }
    }

    const res = await this.prisma.user.findMany({
      where: {
        role: 'Student',
        isActive: true,
        sectionId,
      },
      select: {
        id: true,
        details: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.map((x) => {
      return {
        name: x.details?.name,
        id: x.id,
      };
    });
  }
}
