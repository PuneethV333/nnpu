-- A subject in a section can be taught by more than one teacher.
--
-- The old model was a singular, nullable `SectionSubject.teacherId`. Rather than
-- allowing several `SectionSubject` rows per subject (which would break the
-- `[sectionId, subjectId]` unique that defines a section's subject list), the
-- teachers move to their own table and the scalar column goes away.
--
-- Order matters: the existing single teacher is copied into the new table BEFORE
-- the column is dropped, so no assignment is lost.

-- CreateTable
CREATE TABLE "SectionSubjectTeacher" (
    "id" TEXT NOT NULL,
    "sectionSubjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionSubjectTeacher_pkey" PRIMARY KEY ("id")
);

-- Backfill: every existing single teacher becomes the first member of the set.
INSERT INTO "SectionSubjectTeacher" ("id", "sectionSubjectId", "teacherId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "teacherId", NOW(), NOW()
FROM "SectionSubject"
WHERE "teacherId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SectionSubjectTeacher_sectionSubjectId_teacherId_key" ON "SectionSubjectTeacher"("sectionSubjectId", "teacherId");

-- CreateIndex
CREATE INDEX "SectionSubjectTeacher_teacherId_idx" ON "SectionSubjectTeacher"("teacherId");

-- AddForeignKey
ALTER TABLE "SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubjectTeacher" ADD CONSTRAINT "SectionSubjectTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "SectionSubject" DROP CONSTRAINT "SectionSubject_teacherId_fkey";

-- AlterTable
ALTER TABLE "SectionSubject" DROP COLUMN "teacherId";
