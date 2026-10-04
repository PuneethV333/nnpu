import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * Infra-facing routes. Render's health check and any uptime monitor call these
 * with no Authorization header, so they must stay reachable anonymously.
 *
 * These tests assert *behaviour* (reachable, never rate-limited) rather than
 * decorator metadata, so they stay valid across @nestjs/throttler upgrades.
 */
describe('AppController (infra routes)', () => {
  let app: INestApplication;

  const server = (): Server => app.getHttpServer() as Server;

  @Controller('__throttled')
  class ThrottledControlController {
    @Get()
    ping() {
      return { status: 'ok' };
    }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController, ThrottledControlController],
      providers: [
        AppService,
        // The same global guard AppModule registers, so the skip behaviour is
        // exercised for real rather than assumed.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
      imports: [
        ThrottlerModule.forRoot([
          { ttl: 60_000, limit: 2, blockDuration: 60_000 },
        ]),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('is reachable without an Authorization header', async () => {
      const res = await request(server()).get('/health').expect(200);

      expect(res.body).toMatchObject({ status: 'ok' });
      expect(
        typeof (res.body as { uptimeSeconds: unknown }).uptimeSeconds,
      ).toBe('number');
    });

    it('is excluded from rate limiting', async () => {
      // Well past the limit of 2/min above. A health probe must never be able
      // to exhaust the shared budget and get real API traffic rate-limited.
      for (let i = 0; i < 5; i += 1) {
        await request(server()).get('/health').expect(200);
      }
    });

    it('cannot fail on Postgres or Redis because it depends on neither', () => {
      // AppController takes only AppService, so a liveness check that 503s on a
      // dependency blip is structurally impossible: there is nothing to await.
      // It must stay that way, or Render will restart a working process.
      const controller = new AppController(new AppService());

      expect(controller.health().status).toBe('ok');
    });
  });

  describe('GET / (liveness string)', () => {
    it('is reachable without an Authorization header', async () => {
      await request(server()).get('/').expect(200).expect('Hello World!');
    });
  });

  describe('throttling still applies elsewhere', () => {
    it('429s a normal route past the limit', async () => {
      // Guards against the health tests passing vacuously: proves the global
      // guard really is active in this test module.
      await request(server()).get('/__throttled').expect(200);
      await request(server()).get('/__throttled').expect(200);
      await request(server()).get('/__throttled').expect(429);
    });
  });
});
