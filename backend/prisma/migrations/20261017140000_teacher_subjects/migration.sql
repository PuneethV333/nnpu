-- A subject a teacher teaches, as a property of the teacher rather than an
-- assignment to a section.
--
-- `SectionSubjectTeacher` cannot express this: its rows hang off a
-- `SectionSubject`, so a teacher has no subjects until somebody staffs them into
-- a section. That is why a newly created teacher could not appear in the
-- staffing pickers at all.
--
-- Backfilled from the per-section rows so every teacher who already teaches a
-- subject keeps showing it. DISTINCT because one teacher can take the same
-- subject in several sections, and [teacherId, subjectId] is unique here.

-- CreateTable
CREATE TABLE "TeacherSubject" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("id")
);

-- Backfill
--
-- The subject id is one join away: `SectionSubjectTeacher` points at a
-- `SectionSubject` row, and that is what names the subject. Reading `subjectId`
-- off the join table directly is a column that does not exist.
--
-- DISTINCT because one teacher can take the same subject in several sections
-- while [teacherId, subjectId] is unique here.
INSERT INTO "TeacherSubject" ("id", "teacherId", "subjectId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, pairs."teacherId", pairs."subjectId", NOW(), NOW()
FROM (
    SELECT DISTINCT sst."teacherId", ss."subjectId"
    FROM "SectionSubjectTeacher" AS sst
    JOIN "SectionSubject" AS ss ON ss."id" = sst."sectionSubjectId"
) AS pairs;

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_teacherId_subjectId_key" ON "TeacherSubject"("teacherId", "subjectId");

-- CreateIndex
CREATE INDEX "TeacherSubject_subjectId_idx" ON "TeacherSubject"("subjectId");

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
