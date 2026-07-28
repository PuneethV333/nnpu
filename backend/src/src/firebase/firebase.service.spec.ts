import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FirebaseService } from './firebase.service';
import { LoggerService } from '@/logger/logger.service';

jest.mock('firebase-admin', () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn(),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(),
}));

describe('FirebaseService', () => {
  let service: FirebaseService;
  let mockLogger: { log: jest.Mock; error: jest.Mock };
  let mockConfig: { get: jest.Mock };

  beforeEach(async () => {
    mockLogger = { log: jest.fn(), error: jest.fn() };
    mockConfig = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          FIREBASE_PROJECT_ID: 'test-project',
          FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
          FIREBASE_PRIVATE_KEY: 'fake-key\\nwith-escaped-newline',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(FirebaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('initializes the Firebase app when none exists yet', () => {
      (admin.getApps as jest.Mock).mockReturnValue([]);
      (admin.cert as jest.Mock).mockReturnValue('mock-credential');

      service.onModuleInit();

      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: 'mock-credential',
      });
      expect(admin.cert).toHaveBeenCalledWith({
        projectId: 'test-project',
        clientEmail: 'test@test-project.iam.gserviceaccount.com',
        privateKey: 'fake-key\nwith-escaped-newline', // \\n converted to real \n
      });
      expect(mockLogger.log).toHaveBeenCalledWith('Firebase Admin initialized');
    });

    it('does not re-initialize if an app already exists', () => {
      (admin.getApps as jest.Mock).mockReturnValue([{ name: '[DEFAULT]' }]);

      service.onModuleInit();

      expect(admin.initializeApp).not.toHaveBeenCalled();
    });
  });

  describe('sendPush', () => {
    it('returns undefined immediately if no tokens are given', async () => {
      const result = await service.sendPush([], 'title', 'body');

      expect(result).toBeUndefined();
      expect(getMessaging).not.toHaveBeenCalled();
    });

    it('sends to all tokens and returns successCount with no invalid tokens', async () => {
      const mockSendEachForMulticast = jest.fn().mockResolvedValue({
        successCount: 2,
        responses: [{ success: true }, { success: true }],
      });
      (getMessaging as jest.Mock).mockReturnValue({
        sendEachForMulticast: mockSendEachForMulticast,
      });

      const result = await service.sendPush(
        ['token1', 'token2'],
        'Title',
        'Body',
      );

      expect(mockSendEachForMulticast).toHaveBeenCalledWith({
        tokens: ['token1', 'token2'],
        notification: { title: 'Title', body: 'Body' },
      });
      expect(result).toEqual({ successCount: 2, invalidTokens: [] });
    });

    it('collects invalid tokens from failed responses', async () => {
      const mockSendEachForMulticast = jest.fn().mockResolvedValue({
        successCount: 1,
        responses: [{ success: true }, { success: false }],
      });
      (getMessaging as jest.Mock).mockReturnValue({
        sendEachForMulticast: mockSendEachForMulticast,
      });

      const result = await service.sendPush(
        ['good-token', 'dead-token'],
        'Title',
        'Body',
      );

      expect(result).toEqual({
        successCount: 1,
        invalidTokens: ['dead-token'],
      });
    });

    it('returns a safe fallback if the send throws', async () => {
      (getMessaging as jest.Mock).mockReturnValue({
        sendEachForMulticast: jest
          .fn()
          .mockRejectedValue(new Error('network error')),
      });

      const result = await service.sendPush(['token1'], 'Title', 'Body');

      expect(result).toEqual({ successCount: 0, invalidTokens: [] });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
