# Teacher Home Page — Structure & API Guide

This doc explains how the teacher home screen is (to be) built: the frontend
file structure, which hooks/types/API to use, and the conventions the project
requires. The role dispatch already exists — you only build the screen.

## Where things live

- **Screen:** `app/components/home/main/Teacher.tsx` (currently a placeholder).
- **Route:** `app/app/(tabs)/home.tsx` renders it via `switch (role)` when the
  logged-in role is `Teacher`. No routing changes are needed.
- **Shared home components (create under `app/components/home/`):**
  - `HomeHeader.tsx` — greeting + avatar + name + bell (extract from the
    Student home so all three roles share it).
  - `SectionStatusCard.tsx` — one section with today's attendance status pill.
  - `QuickActions.tsx` — icon + label cards that `router.push` to existing tabs.
- **Reusable existing components:** `components/home/Announcements.tsx`
  (`AnnouncementCard`), `components/attendance-page/SectionPicker.tsx`,
  `components/attendance-page/ProgressCard.tsx`.

## APIs / hooks to use (all exist already — no new backend work)

| Purpose | Endpoint | Hook | Type |
|---|---|---|---|
| Profile (name, avatar, teachingSubjects, classTeacherOf) | `GET /auth/me` | `useAuth().user` | `CurrentUser` (`types/auth.ts`) |
| Sections I can mark attendance for | `GET /sections/mine` (Teacher) | `useGetMySections()` (`hooks/useSections.ts`) | `SectionArray` (`types/section.ts`) |
| Today's marked/locked status per section | `GET /attendance/status?sectionId&date` | `useCheckStatus(sectionId, date)` (`hooks/useAttendance.ts`) | `statusType` (`types/attendance.ts`) |
| Today's calendar day type (Working/Holiday/...) | `GET /calendar?from&to` | `useGetRange(from, to)` (`hooks/useCalendar.ts`) | `CalendarDay` (`types/calendar.ts`) |
| Announcements carousel | `GET /announcement/latest` | `useGetLatest()` (`hooks/useAnnouncement.ts`) | `Latest` (`types/announcement.ts`) |

## Suggested layout

```
HomeHeader (greeting, name, avatar, bell -> /notification)
Today: Working/Holiday/Event chip        <- useGetRange(today, today)
My Sections                              <- useGetMySections()
  [SectionStatusCard] className name ★   <- useCheckStatus(sectionId, todayISO)
  [SectionStatusCard] ...
Quick Actions: Mark Attendance -> /attendance, Enter Marks -> /marks
Announcements                            <- useGetLatest()
```

## Hard requirements (from AGENTS.md)

1. **`GET /time-table/todays` is student-only.** `time-table.service.ts`
   resolves `auth.user.sectionId` and throws if the user has no section — do
   NOT use `useGetTodaysTimeTable()` on the teacher home.
2. **`useCheckStatus` throws `BadRequest` for non-working days.** Only query it
   when today's calendar day type is `Working` (use `useGetRange` to check
   first); otherwise you get 400s on Sundays/holidays.
3. **Date keys must be local, not UTC.** Use the fixed `toISODate(date)` from
   `app/src/libs/week.ts` (returns the local `YYYY-MM-DD`). Backend `@db.Date`
   comes back as UTC-midnight — this function keeps keys consistent so a 31st
   record doesn't render under the 1st.
4. **Layout conventions:** `SafeAreaView edges={['top']}`, bottom clearance via
   `contentContainerStyle={{ paddingBottom: 104 }}` for the floating tab bar.
5. **Components call hooks, never `api/*` directly** (`@/src/hooks/...`).
6. **Empty states:** handle "no sections assigned" (`useGetMySections` can be
   empty) and "no announcements yet".

## Dummy data (optional, UI-first)

If you want to build the UI before the data works, use the `USE_DUMMY` flag at
the top of the file with a dummy object shaped EXACTLY like the Zod type — the
swap to the real hook is then a one-line change.
