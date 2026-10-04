-- Saturday is a working day.
--
-- generateYear() classified Saturday as a Weekend (getUTCDay() === 0 || === 6)
-- while the `Week` enum, the timetable and the attendance-reminder cron
-- (Mon-Sat) all treat Saturday as part of the school week. The result was that
-- attendance could not be marked on a Saturday without a manual override, and
-- Saturday appeared as a holiday in the calendar and the app.
--
-- Only unlabelled Weekend rows are touched: a labelled row is a deliberate
-- admin override and is left alone. Sundays keep their Weekend type.
UPDATE "AcademicCalendarDay"
SET "type" = 'Working', "updatedAt" = NOW()
WHERE "type" = 'Weekend'
  AND "label" IS NULL
  AND EXTRACT(ISODOW FROM "date") = 6;
