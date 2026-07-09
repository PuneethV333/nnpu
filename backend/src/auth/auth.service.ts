import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const auth = await this.prisma.auth.findUnique({
      where: {
        authId: dto.authId,
      },
      include: {
        user: true,
      },
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
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: auth.user.id,
        role: auth.user.role,
      },
    };
  }

  async getMe(authId: string) {
    const auth = await this.prisma.auth.findFirst({
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

    const user = await this.prisma.user.findFirst({
      where: {
        id: auth.userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
