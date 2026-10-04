import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Boots the real AppModule (Prisma, Redis, Firebase, Mail, Razorpay, cron).
 * This is the only suite that proves the whole DI graph actually wires up.
 *
 * Note: URI versioning is enabled in `main.ts`, not in a module, so this
 * in-process app serves unprefixed paths (`/health`) whereas the deployed
 * service serves `/v1/health`. The prefixed path is covered by the live
 * `start:prod` smoke test instead.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('GET /health', () => {
    it('is served without an Authorization header', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok' });
    });

    it('is not blocked by the global rate-limit guard', async () => {
      for (let i = 0; i < 15; i += 1) {
        await request(app.getHttpServer()).get('/health').expect(200);
      }
    });

    it('leaves guarded routes rejecting anonymous callers', async () => {
      // Guards against the health route being "public" because auth was
      // accidentally disabled everywhere.
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('OpenAPI document', () => {
    it('emits no duplicate schema names', () => {
      // Swagger keys component schemas by class name, so two DTO classes sharing
      // a name silently overwrite one another and one endpoint documents the
      // wrong shape. Two `MarkEntryDto` classes used to exist (attendance and
      // marks).
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('test')
          .setVersion('1')
          .addBearerAuth()
          .build(),
      );

      const schemas = Object.keys(doc.components?.schemas ?? {});

      // Prisma emits one schema per model; verify ours are distinctly named.
      expect(schemas).toContain('MarkEntryDto');
      expect(schemas).toContain('MarkEntryForAssessmentDto');
      expect(new Set(schemas).size).toBe(schemas.length);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
