import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';
import { RedisService } from '@/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

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

    // Each dependency is checked in its own try/catch on purpose. A single
    // catch-all around all three turned every possible fault — a bad token, a
    // revoked token, a deactivated account, a Redis outage, a Postgres outage
    // — into the same opaque 401 "Invalid or expired token", which logged every
    // user out during a dependency blip and hid the real cause.
    const payload = await this.verifyToken(token);

    await this.assertNotRevoked(payload.jti);

    // Deliberately not wrapped: if Postgres is down this propagates as a 5xx,
    // which is the truth. Turning it into a 401 would tell the client the
    // user's credentials are bad when they are fine.
    const auth = await this.prisma.auth.findUnique({
      where: { authId: payload.authId },
      select: { tokenVersion: true, user: { select: { isActive: true } } },
    });

    if (
      !auth ||
      !auth.user.isActive ||
      auth.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException('Token has been revoked');
    }

    req.user = payload;
    return true;
  }

  private async verifyToken(
    token: string,
  ): Promise<JwtPayload & { exp: number }> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload & { exp: number }>(
        token,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async assertNotRevoked(jti: string): Promise<void> {
    let isBlacklisted: unknown;

    try {
      isBlacklisted = await this.redis.get(`blacklist:${jti}`);
    } catch (err) {
      // Failing closed here would log out the whole school on a Redis blip,
      // but failing open would honour revoked tokens, so neither is silent:
      // the dependency is down and the client is told to retry.
      this.logger.error(
        `Redis unavailable during token revocation check: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Session revocation check unavailable, please retry',
      );
    }

    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
  }
}
