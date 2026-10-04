import { LoggerService } from '@/logger/logger.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getApps, initializeApp, cert } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * FCM error codes that mean the token itself is dead and will never work again.
 *
 * Anything else — `UNAVAILABLE`, `INTERNAL`, quota, timeouts — is transient and
 * the *same* token succeeds on the next attempt. Treating those as invalid is
 * destructive: callers delete the tokens they are handed, so one Firebase
 * hiccup permanently unsubscribes a teacher from push until they re-register.
 */
const UNRECOVERABLE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** `sendEachForMulticast` rejects more than 500 tokens in one call. */
const FCM_BATCH_LIMIT = 500;

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

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

    // FCM caps a multicast at 500 tokens, and a whole batch of teachers can
    // exceed that. Chunked so a large cohort is not silently dropped.
    const batches = chunk(tokens, FCM_BATCH_LIMIT);

    const invalidTokens: string[] = [];
    let successCount = 0;
    let transientFailures = 0;

    for (const batch of batches) {
      try {
        const response = await getMessaging().sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
        });

        successCount += response.successCount;

        response.responses.forEach((r, i) => {
          if (r.success) return;

          const code = r.error?.code;
          if (typeof code === 'string' && UNRECOVERABLE_TOKEN_CODES.has(code)) {
            invalidTokens.push(batch[i]);
            return;
          }

          // Kept, not deleted: a retry may well succeed.
          transientFailures += 1;
          this.logger.warn(
            `[push] transient failure for a token, keeping it: ${code ?? r.error?.message ?? 'unknown'}`,
          );
        });
      } catch (err) {
        transientFailures += 1;
        this.logger.error('Push send failed', String(err));
      }
    }

    if (transientFailures > 0) {
      this.logger.warn(
        `[push] ${transientFailures} transient failure(s); affected tokens were NOT removed`,
      );
    }

    return { successCount, invalidTokens };
  }
}
