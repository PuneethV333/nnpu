/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: jest.Mocked<PrismaService>;

  const mockAuth = { userId: 'user-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: {
            auth: { findUnique: jest.fn() },
            notification: { findMany: jest.fn(), updateMany: jest.fn() },
            deviceToken: { upsert: jest.fn() },
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

    service = module.get(NotificationService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyNotifications', () => {
    it('throws UnauthorizedException if auth record not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyNotifications('missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns notifications for the resolved user', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      const mockNotifications = [{ id: 'n1', title: 'Test' }];
      (prisma.notification.findMany as jest.Mock).mockResolvedValue(
        mockNotifications,
      );

      const result = await service.getMyNotifications('nnpu1sb26ka1');

      expect(result).toEqual(mockNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: mockAuth.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('markAsRead', () => {
    it('throws UnauthorizedException if auth record not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead('notif-1', 'missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('updates only notifications belonging to the resolved user', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const result = await service.markAsRead('notif-1', 'nnpu1sb26ka1');

      expect(result).toEqual({ count: 1 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: mockAuth.userId },
        data: { isRead: true },
      });
    });
  });

  describe('registerDevice', () => {
    it('throws UnauthorizedException if auth record not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registerDevice('missing', {
          token: 'device-token',
          platform: 'android',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('upserts the device token for the resolved user', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(mockAuth);
      const mockDeviceToken = {
        id: 'dt1',
        userId: mockAuth.userId,
        token: 'device-token',
        platform: 'android',
      };
      (prisma.deviceToken.upsert as jest.Mock).mockResolvedValue(
        mockDeviceToken,
      );

      const result = await service.registerDevice('nnputeacher1', {
        token: 'device-token',
        platform: 'android',
      });

      expect(result).toEqual(mockDeviceToken);
      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
        where: { token: 'device-token' },
        update: { userId: mockAuth.userId, platform: 'android' },
        create: {
          userId: mockAuth.userId,
          token: 'device-token',
          platform: 'android',
        },
      });
    });
  });
});
