import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './types/jwt-payload.type';
import { RedisService } from '@/redis/redis.service';
import { randomUUID } from 'crypto';
import { changePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async login(dto: LoginDto) {
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

    const payload: JwtPayload = {
      authId: auth.authId,
      role: auth.user.role,
      jti: randomUUID(),
      tokenVersion: auth.tokenVersion,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: { id: auth.user.id, role: auth.user.role },
    };
  }

  async getMe(authId: string) {
    const cacheKey = `me:${authId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return {
        source: 'redis',
        data: cached,
      };
    }

    const auth = await this.prisma.auth.findUnique({
      where: {
        authId,
      },
      select: {
        userId: true,
      },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: auth.userId,
      },
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

    await this.redis.set<typeof user>(cacheKey, user, 300);

    return {
      data: user,
      source: 'db',
    };
  }

  async logOut(jti: string, exp: number) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ttl = exp - nowInSeconds;

    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, true, ttl);
    }

    return { message: 'Logged out successful' };
  }

  async changePassword(authId: string, dto: changePasswordDto) {
    const auth = await this.prisma.auth.findUnique({ where: { authId } });

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

    await this.prisma.auth.update({
      where: {
        authId,
      },
      data: {
        password: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    await this.redis.del(`me:${authId}`);

    return { message: 'Password changed successfully. Please log in again.' };
  }
}
