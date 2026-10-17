-- Re-flip Saturday Weekend rows to Working.
--
-- `20261004130000_saturday_is_a_working_day` flipped the rows that existed at
-- the time, but the 2026 calendar was seeded *after* it by `prisma/dummy.ts`,
-- which still classified Saturday as a Weekend (`getUTCDay() === 0 || === 6`).
-- The service fix and the seed had drifted apart, so the migration ran against
-- an empty table and every Saturday was then inserted as a Weekend. Marking
-- attendance on a Saturday is rejected by
-- `AttendanceService.getRoster`/`markAttendance` ("Cannot mark attendance on a
-- Weekend day"), which is the user-visible symptom.
--
-- The seed is fixed in the same change, so this backfill is only needed for
-- databases seeded before that fix. It is idempotent and mirrors the original
-- migration: only unlabelled Weekend rows are touched (a labelled row is a
-- deliberate admin override), and Sundays keep their Weekend type.
UPDATE "AcademicCalendarDay"
SET "type" = 'Working', "updatedAt" = NOW()
WHERE "type" = 'Weekend'
  AND "label" IS NULL
  AND EXTRACT(ISODOW FROM "date") = 6;
