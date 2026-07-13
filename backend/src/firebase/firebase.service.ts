import { LoggerService } from '@/logger/logger.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getApps, initializeApp, cert } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.config
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        }),
      });
      this.logger.log('Firebase Admin initialized');
    }
  }

  async sendPush(tokens: string[], title: string, body: string) {
    if (tokens.length === 0) return;

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
      });

      const invalidTokens: string[] = [];

      response.responses.forEach((r, i) => {
        if (!r.success) invalidTokens.push(tokens[i]);
      });

      return { successCount: response.successCount, invalidTokens };
    } catch (err) {
      this.logger.error('Push send failed', String(err));
      return { successCount: 0, invalidTokens: [] };
    }
  }
}
