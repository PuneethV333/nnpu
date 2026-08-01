# Admin Home Page — Structure & API Guide

This doc explains how the admin home screen is (to be) built: the frontend
file structure, which hooks/types/API to use, and the conventions the project
requires. The role dispatch already exists — you only build the screen.

## Where things live

- **Screen:** `app/components/home/main/Admin.tsx` (currently a placeholder).
- **Route:** `app/app/(tabs)/home.tsx` renders it via `switch (role)` when the
  logged-in role is `Admin`. No routing changes are needed.
- **Shared home components (create under `app/components/home/`):**
  - `HomeHeader.tsx` — greeting + avatar + name + bell (extract from the
    Student home so all three roles share it).
  - `SchoolStatsGrid.tsx` — 2×2 stat cards; copy the `StatCard` pattern from
    `app/components/profile-page/main/Admin.tsx` (Students = `noOfStudents`,
    Teachers = `noOfTeacher`, Boys = `noOfBoys`, Girls = `noOfGirls` from
    `user.school` on `GET /auth/me`).
  - `QuickActions.tsx` — icon + label cards that `router.push` to existing tabs.

## APIs / hooks to use

### Existing (no backend work)

| Purpose | Endpoint | Hook | Type |
|---|---|---|---|
| Profile + school stats | `GET /auth/me` | `useAuth().user` | `CurrentUser` (`types/auth.ts`) |
| Today's calendar day type | `GET /calendar?from&to` | `useGetRange(from, to)` (`hooks/useCalendar.ts`) | `CalendarDay` (`types/calendar.ts`) |
| Announcements carousel | `GET /announcement/latest` | `useGetLatest()` (`hooks/useAnnouncement.ts`) | `Latest` (`types/announcement.ts`) |

### New (just added — see Backend section)

| Purpose | Endpoint | Hook | Type |
|---|---|---|---|
| Dashboard aggregates (attendance %, pending enrollments, open drives, pending fees, upcoming events) | `GET /dashboard/admin` | `useGetAdminDashboard()` (`hooks/useDashboard.ts`) | `AdminDashboard` (`types/dashboard.ts`) |

`useGetAdminDashboard()` is **Admin-only**: the query's `enabled` is
`isAuthenticated && role === 'Admin'`, and the route is guarded by
`JwtAuthGuard` + `RolesGuard` with `@Roles('Admin')`.

## Suggested layout

```
HomeHeader (greeting, name, avatar, bell -> /notification)
SchoolStatsGrid (Students / Teachers / Boys / Girls)
Today chip (Working/Holiday/Event)        <- useGetRange(today, today)
Dashboard cards (from useGetAdminDashboard):
  Attendance Today   marked/total (percentage)
  Pending Enrollments
  Open Enrollment Drives
  Pending Fees       count + amountPending (₹, from invoice totals)
  Upcoming Events    next 5 non-Working AcademicCalendarDay
Quick Actions (link to existing tabs):
  Mark Attendance -> /attendance, Enter Marks -> /marks, Manage Fees -> /fees
Announcements                              <- useGetLatest()
```

## AdminDashboard response shape

`GET /dashboard/admin` returns:

```ts
{
  today:      { date: "YYYY-MM-DD", type: DayType | null, label: string | null },
  attendanceToday: { totalStudents, marked, percentage },
  pendingEnrollments: number,          // EnrollmentSubmission status=Pending
  openDrives: number,                  // EnrollmentDrive status=Open
  fees:       { pendingInvoices, amountPending },  // amount in rupees, from invoice totals
  upcomingEvents: [{ date: string, type: DayType, label: string | null }]  // next 5, non-Working
}
```

`date` fields are serialized ISO strings; the Zod schema uses `z.coerce.date()`
so you get real `Date` objects in the app. The endpoint result is Redis-cached
for 5 minutes (key `dashboard:admin`).

## Backend (reference — already implemented)

- Module: `backend/src/dashboard/` (`dashboard.module.ts`, `dashboard.controller.ts`,
  `dashboard.service.ts`, `dashboard.service.spec.ts`, `types/dashboard.type.ts`).
- Route: `GET /dashboard/admin`, `@Roles('Admin')`, `@Throttle({ default: { limit: 30, ttl: 60000 } })`.
- Registered in `backend/src/app.module.ts` imports (added `DashboardModule`).
- All counts run in parallel via `Promise.all`; "today" is UTC-midnight so it
  matches the `@db.Date` comparisons used elsewhere.

## Hard requirements (from AGENTS.md)

1. **Date keys must be local, not UTC.** Use the fixed `toISODate(date)` from
   `app/src/libs/week.ts`. Backend `@db.Date` is UTC-midnight; this keeps
   calendar/attendance day keys consistent.
2. **Layout conventions:** `SafeAreaView edges={['top']}`, bottom clearance via
   `contentContainerStyle={{ paddingBottom: 104 }}` for the floating tab bar.
3. **Components call hooks, never `api/*` directly.**
4. **Show loading/error states** for `useGetAdminDashboard` (`isLoading`,
   `isError`) before rendering the cards.
5. **Currency formatting:** use the existing formatter in the app for
   `amountPending` (₹) rather than hand-rolling it.
6. **Empty states:** handle "no upcoming events" and "no announcements yet".
