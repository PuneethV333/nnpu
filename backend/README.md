# NNPU Backend

NestJS backend for NNPU (Education Platform) - handles student enrollment, fee management, attendance, marks, timetables, and more.

## Tech Stack

- **Framework**: NestJS 11 (TypeScript, decorators, DI)
- **Database**: PostgreSQL via Prisma ORM (@prisma/adapter-pg)
- **Queue**: BullMQ + Redis (report-card generation)
- **Auth**: JWT + Passport + Firebase Admin
- **Payments**: Razorpay
- **Email**: Nodemailer
- **PDF**: pdfkit, pdfmake
- **Validation**: class-validator + class-transformer + Zod
- **Rate Limiting**: @nestjs/throttler
- **Logging**: pino + pino-pretty

## Project Structure

```
backend/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Root module
│   ├── app.controller.ts       # Health check endpoint
│   ├── auth/                   # JWT + Firebase Auth
│   ├── onboarding/             # School setup (admin, teacher, student, section, academic year)
│   ├── fees/                   # Fee structures, invoices, Razorpay webhooks
│   ├── report-card/            # PDF generation via BullMQ queue
│   ├── calendar/               # Academic calendar generation
│   ├── announcement/           # Announcements CRUD
│   ├── enrollment/             # Student enrollment via Google Forms
│   ├── attendance/             # Attendance marking & summaries
│   ├── marks/                  # Marks entry & reports
│   ├── time-table/             # Timetable management
│   ├── mail/                   # Nodemailer service
│   ├── firebase/               # Firebase Admin SDK
│   ├── google/                 # Google Forms & Drive integration
│   ├── redis/                  # Redis service & module
│   ├── logger/                 # Pino logger wrapper
│   ├── prisma/                 # Prisma service & module
│   ├── notification/           # Push notifications
│   └── types/express.d.ts      # Express types augmentation
├── prisma/
│   └── schema.prisma           # Database schema
├── test/
│   ├── app.e2e-spec.ts         # E2E tests
│   └── jest-e2e.json           # E2E Jest config
├── nest-cli.json               # Nest CLI config
├── tsconfig.json               # TypeScript config
├── eslint.config.mjs           # ESLint config
├── .prettierrc                 # Prettier config
└── package.json
```

## Key Modules

| Module | Purpose |
|--------|---------|
| **auth** | JWT + Firebase token validation, login/refresh/logout, role-based guards |
| **onboarding** | Initial school setup: create school, admin, teachers, students, sections, academic years |
| **fees** | Fee structures, invoice generation, Razorpay payment integration |
| **report-card** | PDF report card generation (queued via BullMQ) |
| **calendar** | Academic calendar (holidays, events, working days) |
| **announcement** | CRUD for school/section announcements |
| **enrollment** | Google Forms-based student enrollment drives |
| **attendance** | Daily attendance marking, summaries |
| **marks** | Marks entry, report cards, assessment management |
| **time-table** | Timetable creation & retrieval |
| **mail** | Transactional emails via Nodemailer |
| **firebase** | Firebase Admin SDK initialization |
| **google** | Google Forms creation & response fetching |
| **redis** | Caching & session storage |
| **prisma** | Database client wrapper |
| **logger** | Structured logging with Pino |

## Development Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Debug mode
npm run start:debug

# Build for production
npm run build

# Production run
npm run start:prod

# Lint & fix
npm run lint

# Format code
npm run format

# Tests
npm run test           # Unit tests
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report
npm run test:e2e       # E2E tests
```

## Environment Variables

Create a `.env` file in `backend/`:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret
JWT_ACCESS_EXPIRES_IN=15m

# App
PORT=5000
NODE_ENV=development

# Firebase Admin
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Google OAuth (for Forms/Drive)
CLIENT_ID=xxx
CLIENT_SECRET=xxx
REFRESH_TOKEN=xxx

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email
SMTP_PASS=your-password
SMTP_FROM=NNPU <noreply@nnp.edu>

# CORS
CORS_ORIGINS=http://localhost:3000
```

## Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (dev)
npx prisma migrate dev

# Deploy migrations (prod)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

## Core Features

### Authentication
- **Login**: `POST /auth/login` (authId + password)
- **Refresh**: `POST /auth/refresh` (refresh token rotation)
- **Me**: `GET /auth/me` (cached via Redis)
- **Logout**: `POST /auth/logout` (JWT blacklist in Redis)
- **Change Password**: `POST /auth/change-password`
- **Guards**: `JwtAuthGuard` + `RolesGuard` (@Roles('Admin', 'Teacher', 'Student'))

### Enrollment Flow
1. Admin creates drive → generates Google Form with sessions/combinations
2. Students submit form
3. **Close cron** (hourly): fetches responses before deadline, creates `EnrollmentSubmission` records
4. **Promote cron** (hourly): promotes `Pending` submissions → creates `User` + `Auth` + sends credentials email

### Fees & Payments
- Fee structures per section/academic year
- Invoice generation (bulk or individual)
- Razorpay order creation & webhook handling
- Payment verification & receipt generation

### Timetable
- Period definitions per stream
- Section-specific timetables
- Teacher & subject assignments

## API Documentation

Swagger UI available at `/api` when running in development mode.

## Deployment

```bash
# Build
npm run build

# Run
node dist/main.js
```

**Requirements**: PostgreSQL, Redis, Firebase credentials, Razorpay keys, SMTP server.

## Git Hooks

- `lint-staged` runs `eslint --fix` on staged `.ts` files pre-commit

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov  # outputs to coverage/
```

## License

UNLICENSED - Private project