/*
  Warnings:

  - The values [SUNDAY] on the enum `Week` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[email]` on the table `PersonalDetails` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `PersonalDetails` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EnrollmentDriveStatus" AS ENUM ('Open', 'Closed', 'Processed');

-- CreateEnum
CREATE TYPE "EnrollmentSubmissionStatus" AS ENUM ('Pending', 'Promoted', 'Rejected');

-- AlterEnum
BEGIN;
CREATE TYPE "Week_new" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');
ALTER TABLE "TimetableSlot" ALTER COLUMN "day" TYPE "Week_new" USING ("day"::text::"Week_new");
ALTER TYPE "Week" RENAME TO "Week_old";
ALTER TYPE "Week_new" RENAME TO "Week";
DROP TYPE "public"."Week_old";
COMMIT;

-- AlterTable
ALTER TABLE "PersonalDetails" ADD COLUMN     "email" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EnrollmentDrive" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" "EnrollmentDriveStatus" NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentDrive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentSubmission" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stream" "Stream" NOT NULL,
    "session" TEXT NOT NULL,
    "combinationId" TEXT,
    "language" "SecondLanguage",
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "status" "EnrollmentSubmissionStatus" NOT NULL DEFAULT 'Pending',
    "promotedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentDrive_academicYearId_idx" ON "EnrollmentDrive"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentSubmission_promotedUserId_key" ON "EnrollmentSubmission"("promotedUserId");

-- CreateIndex
CREATE INDEX "EnrollmentSubmission_driveId_status_idx" ON "EnrollmentSubmission"("driveId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentSubmission_email_idx" ON "EnrollmentSubmission"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalDetails_email_key" ON "PersonalDetails"("email");

-- AddForeignKey
ALTER TABLE "EnrollmentDrive" ADD CONSTRAINT "EnrollmentDrive_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSubmission" ADD CONSTRAINT "EnrollmentSubmission_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "EnrollmentDrive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
