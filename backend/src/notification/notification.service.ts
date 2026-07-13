import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async getMyNotifications(authId: string) {
    this.logger.log('[get-notification]');
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    return await this.prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, authId: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId: auth.userId },
      data: { isRead: true },
    });
  }

  async registerDevice(authId: string, dto: RegisterDeviceDto) {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('user not found');
    }

    const res = await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      update: { userId: auth.userId, platform: dto.platform },
      create: { userId: auth.userId, token: dto.token, platform: dto.platform },
    });

    return res;
  }
}
