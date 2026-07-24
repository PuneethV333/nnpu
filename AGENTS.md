# NNPU Backend - AGENTS.md

## Project Overview
NestJS backend for NNPU (NNPU - presumably an education platform). Uses NestJS, Prisma (PostgreSQL), BullMQ (Redis), Firebase Auth, Razorpay, Firebase Admin, Nodemailer, BullMQ queues.

## Key Commands
```bash
# Install dependencies
npm install

# Development
npm run start:dev      # Watch mode
npm run start:debug    # Debug mode

# Build
npm run build          # Compiles to dist/

# Production
npm run start:prod     # Runs dist/main.js

# Lint & Format
npm run lint           # ESLint with auto-fix
npm run format         # Prettier format

# Test
npm run test           # Unit tests (Jest)
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report
npm run test:e2e       # E2E tests (test/jest-e2e.json)
```

## Project Structure
```
backend/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Root module
│   ├── auth/                   # JWT + Firebase Auth
│   ├── fees/                   # Fee management + Razorpay
│   ├── report-card/            # PDF generation + BullMQ queue
│   ├── calendar/               # Academic calendar
│   ├── announcement/           # Announcements
│   ├── mail/                   # Nodemailer
│   ├── firebase/               # Firebase Admin
│   └── types/express.d.ts      # Express types
├── prisma/
│   └── schema.prisma           # Prisma schema (PostgreSQL)
├── test/
│   ├── app.e2e-spec.ts         # E2E tests
│   └── jest-e2e.json           # E2E Jest config
├── prisma.config.ts            # Prisma config
├── nest-cli.json               # Nest CLI config
├── tsconfig.json               # TS config
├── eslint.config.mjs           # ESLint config
├── .prettierrc                 # Prettier config
└── package.json
```

## Key Technologies
- **Framework**: NestJS 11 (TypeScript, decorators, DI)
- **Database**: Prisma ORM + PostgreSQL (@prisma/adapter-pg)
- **Queue**: BullMQ + ioredis (report-card queue)
- **Auth**: JWT + Passport + Firebase Admin
- **Payments**: Razorpay
- **Email**: Nodemailer
- **PDF**: pdfkit, pdfmake
- **Validation**: class-validator + class-transformer + Zod
- **Validation pipes**: class-validator + class-transformer pipes
- **Rate limiting**: @nestjs/throttler
- **Logging**: pino + pino-pretty

## Environment Variables (.env)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

## Development Workflow
1. `npm run start:dev` - Hot reload dev server
2. Make changes in `src/`
3. `npm run lint` - Fix linting issues
4. `npm run format` - Format code
5. `npm run test` - Run unit tests
6. `npm run build` - Verify build compiles

## Testing
- **Unit**: `src/**/*.spec.ts` (Jest + ts-jest)
- **E2E**: `test/app.e2e-spec.ts` (Supertest + Nest testing module)
- Coverage: `npm run test:cov` → `coverage/`

## Database
- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Generate client: `npx prisma generate`
- Migrate: `npx prisma migrate dev` (dev) / `npx prisma migrate deploy` (prod)

## Key Modules
| Module | Purpose |
|--------|---------|
| auth | JWT + Firebase token validation |
| fees | Fee structures, invoices, Razorpay webhooks |
| report-card | PDF generation via BullMQ queue |
| calendar | Academic calendar generation |
| announcement | Announcements CRUD |
| mail | Email sending via Nodemailer |
| firebase | Firebase Admin SDK init |

## TypeScript Config
- Target: ESNext
- Module: Node16 (ESM interop)
- Strict mode: strict, strictNullChecks
- Paths: `@/*` → `src/*`
- Decorators: experimentalDecorators + emitDecoratorMetadata

## Lint/Format
- ESLint: typescript-eslint + eslint-plugin-prettier
- Prettier: Single quotes, trailing commas, 100 char width
- Run both: `npm run lint` (includes --fix)

## Git Hooks
- lint-staged on `.ts` files runs `eslint --fix` on staged files

## Deployment
- Build: `npm run build` → `dist/`
- Run: `node dist/main.js`
- Requires: PostgreSQL, Redis, Firebase credentials, Razorpay keys, SMTP