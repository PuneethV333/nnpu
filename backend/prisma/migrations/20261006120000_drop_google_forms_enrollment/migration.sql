-- Drop the Google Forms enrollment pipeline.
--
-- Enrollment is now a CSV upload into a single Section (`EnrollmentService.importStudentsFromCsv`).
-- There is no drive, no form and no submission queue any more, so these two tables
-- only held stale Google Form response rows.
--
-- Dropped rather than left empty, unlike the parked `ReportCard` model: this pipeline
-- is replaced, not deferred, and the tables carry no data worth keeping.
--
-- `EnrollmentSubmissionStatus` and `EnrollmentDriveStatus` go with them — no other
-- model referenced either enum.

DROP TABLE IF EXISTS "EnrollmentSubmission";
DROP TABLE IF EXISTS "EnrollmentDrive";

DROP TYPE IF EXISTS "EnrollmentSubmissionStatus";
DROP TYPE IF EXISTS "EnrollmentDriveStatus";