import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';
import { RedisService } from '@/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing auth token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync<
        JwtPayload & { exp: number }
      >(token);

      const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const auth = await this.prisma.auth.findUnique({
        where: { authId: payload.authId },
        select: { tokenVersion: true },
      });

      if (!auth || auth.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Token has been revoked');
      }

      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
