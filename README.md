# School Management System for nnpu

This file orients an AI coding agent (or a new contributor) to how this
codebase is actually built. It reflects real decisions made during
development — follow these patterns rather than reinventing structure per
file.

## Stack

- **Backend:** NestJS + Prisma + PostgreSQL, deployed on a low-RAM
  Hostinger KVM1 — avoid heavy dependencies (e.g. no Puppeteer-style
  processes; prefer lightweight libraries like `nodemailer` over SMTP).
- **Frontend:** React Native (Expo Router), NativeWind (Tailwind classes),
  TanStack Query, Zod for runtime validation, `expo-secure-store` for
  token storage.
- **Auth:** Self-hosted JWT (`@nestjs/jwt` + `passport-jwt`), bcrypt,
  refresh-token table in Postgres, role-based guards.
- **Push:** Firebase Cloud Messaging via native device tokens (NOT
  Expo's push token/service) — requires a dev client build, does not
  work in Expo Go.
- **Payments:** Razorpay, with both client-verified and server-to-server
  webhook confirmation paths (idempotent via `status: { not: 'Success' }`
  guards).
- **Third-party integration:** Google Forms v1 + Drive v3 APIs via a
  single shared OAuth2 refresh-token client (NOT a service account —
  Forms API doesn't support pure service-account auth without Workspace
  domain-wide delegation).

## Backend module structure

Every feature is a self-contained Nest module:

```
feature/
  feature.module.ts
  feature.controller.ts
  feature.service.ts
  dto/
    some-action.dto.ts
  types/                # only if the module needs shared internal types
    feature.types.ts
  cron/                 # only if the module has scheduled jobs
    some-job.cron.ts
```

- **Controllers are thin** — validate/guard, delegate to the service.
  No business logic in controllers.
- **One service per module owns all business logic for that domain.**
  If a cron job and a manual admin endpoint need the same operation
  (e.g. "promote one enrollment submission"), that logic lives ONCE in
  the service; the cron and the controller both call it. Never
  duplicate business logic between a cron file and its service — this
  has been a recurring real bug in this codebase (enrollment promotion
  logic drifted between `enrollment-promote.cron.ts` and
  `enrollment.service.ts` until consolidated).
- **Every service method that needs the current user resolves it the
  same way**, via a private `resolveUser(authId)` helper:
  ```typescript
  private async resolveUser(authId: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true, user: { select: { role: true } } },
    });
    if (!auth) throw new UnauthorizedException('user not found');
    return { userId: auth.userId, role: auth.user.role };
  }
  ```
  Don't re-derive `userId` from `authId` inline in multiple places —
  use this helper. Note: if `auth.user` (the full included User row) is
  already fetched, don't run a second separate `user.findUnique` for
  fields already present on it — this was a caught redundant-query bug.

- **Modules must export providers they want other modules to inject.**
  A module with `providers: [X]` but no matching `exports: [X]` will
  compile until another module tries to actually inject `X`, then fails
  at bootstrap with a DI resolution error. This has bitten this codebase
  before (`GoogleModule` initially didn't export its services).

- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('Admin')`
  (or `'Teacher'`, `'Student'`) on every protected route. Public routes
  (e.g. Razorpay webhook) explicitly have no guard and are commented as
  intentionally public.

- **Rate limiting:** `@Throttle({ default: { limit: N, ttl: 60000 } })`
  per-route, tuned to the route's actual risk (mutation endpoints get
  tighter limits than reads).

## Prisma conventions

- IDs: `@id @default(cuid())` except `User`/`RefreshToken` which use
  `@default(uuid())` — this is pre-existing and intentional, not to be
  "fixed" for consistency.
- Every model has `createdAt DateTime @default(now())` and
  `updatedAt DateTime @updatedAt`.
- Relations: named relations (`@relation("SomeName", ...)`) used
  wherever a model has multiple relations to the same target (e.g.
  `User.studentAttendances` vs `User.markedAttendances`, both → `Attendance`).
- **Every new relation field needs its reverse side declared on the
  other model**, or `prisma generate`/`migrate` fails validation. When
  adding a new model that references an existing one (e.g. adding
  `EnrollmentDrive.academicYear`), always add the corresponding
  `enrollmentDrives EnrollmentDrive[]` back on `AcademicYear` in the same
  change.
- Enums are the source of truth for fixed sets (`Role`, `Stream`,
  `SecondLanguage`, `AssessmentCategory`, etc.) — don't validate these
  as free strings anywhere; DTOs should use `@IsIn([...])` or better,
  import and check against the real enum.
- **Staging-table pattern for any bulk-import-like flow:** raw
  external data (e.g. Google Form responses) is never written directly
  into live tables (`User`, `Auth`). It lands in a dedicated staging
  model first (see `EnrollmentSubmission`), with a `status` enum
  (`Pending` / `Promoted` / `Rejected`) and a nullable
  `promotedUserId` link back to the real record once promoted. This
  lets a single bad row get corrected without touching production auth
  data directly, and keeps the batch idempotent (safe to re-run).
- Composite unique constraints matter for correctness, not just DB
  hygiene — e.g. `Section.@@unique([classId, session, academicYearId])`
  has no `stream` in it, so when two streams (Science/Commerce) both
  create sessions named "A", the session VALUE stored must be
  stream-disambiguated internally (e.g. `"SCI-A"` vs `"COM-A"`) even
  though students only ever see the plain label. Forgetting this causes
  silent cross-stream data collisions, not just a thrown error.

## Timezone/date gotchas already hit in this codebase

- `Week` enum currently has NO `Sunday` (schools don't operate Sundays).
  Any code deriving "today" from `new Date().getDay()` must handle the
  `0` (Sunday) case explicitly rather than assuming a `Week` enum value
  exists for every day of `getDay()`'s output.
- Cron jobs run hourly and re-check a condition (e.g. `closesAt: { lte:
  new Date() }`) rather than firing once at an exact scheduled instant.
  This is deliberate — it survives server restarts/deploys without
  missing a window, at the cost of imprecise-to-the-minute timing (fine
  for daily/24h-scale windows, not fine for anything needing
  second-level precision).
- Any "close after N hours" requirement enforced against a third-party
  system (e.g. Google Forms) should filter by the THIRD PARTY's own
  recorded timestamp (e.g. `response.lastSubmittedTime`) rather than
  trusting that system's own accept/reject toggle to have fired
  precisely on schedule.

## Google Forms/Drive integration specifics

- `GoogleAuthService` holds ONE shared `OAuth2Client` (refresh-token
  flow); `GoogleFormsService` and `GoogleDriveService` both consume it.
  Never instantiate a second OAuth client — auth state must stay
  centralized so token refresh/rotation only needs to change one place.
- Forms `batchUpdate` question-creation replies come back in the SAME
  ORDER requests were sent — this is documented Google behavior and is
  relied upon (`extractItemIds`'s positional `order` array mapping).
  If you add/reorder questions in a form-builder method, the `order`
  array passed to `extractItemIds` must be updated to match, in the
  same order.
- Question `itemId`s are NOT stable/predictable ahead of time — they're
  generated by Google at creation time and must be captured from the
  `batchUpdate` response and persisted (see `EnrollmentDrive.questionMap`,
  a `Json` column). Never hardcode an `itemId`.
- Any dropdown/choice question whose valid options are also being
  created as DB rows in the same operation (e.g. sessions, which
  become `Section` rows) should be built FROM the same array used to
  create those rows — never let the form's options and the DB rows
  drift by being declared twice.
- Type Google API calls properly (`forms_v1.Schema$Request`,
  `forms_v1.Schema$BatchUpdateFormResponse` from `googleapis`) rather
  than `any` — untyped `any` here cascades into
  `@typescript-eslint/no-unsafe-*` lint errors at every property access
  downstream.

## Mail

- `MailService` wraps `nodemailer` over SMTP (not a heavier provider,
  matching the low-resource hosting constraint). `.send()` for one
  email; `.sendBulk()` for many, with a deliberate delay between sends
  to avoid tripping SMTP rate limits during a large batch (e.g.
  enrollment credential emails to a whole cohort).
- Gmail SMTP's ~500/day cap is a real constraint if bulk-sending to a
  large student body — a transactional email provider should be
  considered before relying on Gmail SMTP for a full-cohort send.

## Frontend (React Native / Expo)

- **File split:** `src/api/` = raw axios calls + Zod parse; `src/hooks/`
  = TanStack Query wrappers around the api functions. Never call
  `api/*` functions directly from a component — go through the hook.
- **Every API response type has a matching Zod schema** in
  `src/types/`, and the api function parses the raw response through it
  before returning. This is the project's actual runtime type-safety
  boundary — don't skip it "just this once" for a new endpoint.
- **Dummy data for UI-first development:** components/pages needing
  data before a backend endpoint is stable use a `USE_DUMMY` boolean
  flag at the top of the file, with a dummy object shaped EXACTLY like
  the real Zod-parsed type (not a loose approximation) — this makes
  swapping to the real hook a one-line change with no prop-shape
  surprises later.
- **`SafeAreaView` gets `edges={['top']}` only.** Bottom safe-area
  clearance for the floating tab bar is handled via
  `contentContainerStyle={{ paddingBottom: ... }}` on the scroll view
  inside, computed from the actual tab bar height config
  (`components.tabBar.height` + `Math.max(insets.bottom,
  tabBar.horizontalInset)`), NOT via `SafeAreaView`'s own bottom edge —
  using both simultaneously double-pads the screen. This was a real
  repeated bug in this codebase.
- **Context providers must wrap the component that consumes them.** A
  hook using `useContext` must be called from a component that is a
  JSX DESCENDANT of its provider — not from the same component function
  that instantiates the provider one level up. If a hook needing
  `useAuth()` needs to run at the app root, extract a small child
  component (e.g. `AppShell`) that renders inside `<AuthProvider>`,
  don't call the hook directly inside the root layout function before
  the provider JSX is returned.
- **Vertical scroll views should not be nested inside each other.**
  Prefer one outer scroll container per screen; a horizontal
  `FlatList`/`ScrollView` nested inside a vertical one is fine (different
  axis), but two vertical scrollers stacked is a real source of bugs.
- Native config changes (Firebase files, permissions, entitlements,
  new Expo config plugins like `expo-notifications`) require
  `npx expo prebuild --clean` + a fresh
  `npx expo run:android`/`run:ios` — a JS-only reload will NOT pick
  these up.
- `google-services.json` / `GoogleService-Info.plist` are gitignored,
  kept locally only (no CI/secrets pipeline needed for a solo local-build
  setup — that complexity is only worth it once on EAS Build or with a
  team needing shared secrets).

## Testing

- Service tests mock `PrismaService` manually (plain Jest mock objects
  matching the shape of whichever Prisma methods are called), NOT a
  real test database. `$transaction` is mocked as
  `jest.fn((callback) => callback(tx))` so transactional service code
  can be tested against a mock transaction client (`tx`) without a real
  DB.
- When a schema field is added that flows into an existing `create()`
  call (e.g. adding `PersonalDetails.email`), any existing test
  asserting on that `create()` call's exact argument shape MUST be
  updated in the same change — these tests are exact-match assertions
  (`toHaveBeenCalledWith`), not partial matchers, so they will fail
  loudly (correctly) on any shape drift. Update the test, don't loosen
  the assertion.

## Known open items (as of last working session)

- `EnrollmentService`/onboarding's `createStudent` path passes
  `email: ''` for manually-admin-created students — this WILL collide
  on `PersonalDetails.email`'s `@unique` constraint for the second such
  student. Needs a real `email` param added to `CreateStudentDto` if
  that manual-creation path is still active (vs. fully superseded by
  the enrollment flow for 1st PUC).
- No admin-facing endpoint yet to edit an `EnrollmentSubmission`'s
  fields before re-promoting it (the "fix a typo" flow) — only
  re-triggering promotion on the row as-is exists so far.
- Promotion of continuing students (1st → 2nd PUC) is an intentionally
  separate, not-yet-built flow — do not conflate with the enrollment
  (fresher-only) pipeline.