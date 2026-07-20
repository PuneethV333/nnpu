import { PrismaService } from '@/prisma/prisma.service';
import {
  Injectable,
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
    const auth = await this.prisma.auth.findUnique({
      where: { authId: dto.authId },
      include: { user: true },
    });

    if (!auth) {
      throw new UnauthorizedException('Invalid auth id or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, auth.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid school ID or password');
    }

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

  async refresh(dto: refreshDto) {
    const part = dto.refreshToken.split('.');

    if (part.length !== 2) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const [tokenId, tokenSecret] = part;

    const refresh = await this.prisma.refreshToken.findUnique({
      where: { tokenId },
      include: { auth: { include: { user: true } } },
    });

    if (!refresh) {
      throw new UnauthorizedException();
    }

    if (refresh.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(tokenSecret, refresh.tokenHash);
    if (!valid) {
      throw new UnauthorizedException();
    }

    // FIX: no longer routes through login(); issues tokens directly,
    // so no fake password is ever passed anywhere.
    const { accessToken, refreshToken } = await this.issueTokens(
      refresh.auth.authId,
      refresh.auth.user.role,
      refresh.auth.tokenVersion,
    );

    await this.prisma.refreshToken.delete({ where: { tokenId } });

    return { accessToken, refreshToken };
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
        section: true,
        teachingSubjects: true,
        classTeacherOf: true,
        school: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.redis.set(cacheKey, user, 300);

    return { data: user, source: 'db' };
  }

  async logOut(jti: string, exp: number) {
    this.logger.warn('[logged-out]');
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ttl = exp - nowInSeconds;

    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, true, ttl);
    }

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
        school: {
          select: {
            name: true,
            noOfStudents: true,
            noOfTeacher: true,
            noOfBoys: true,
            noOfGirls: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('profile not found');
    return user;
  }
}
