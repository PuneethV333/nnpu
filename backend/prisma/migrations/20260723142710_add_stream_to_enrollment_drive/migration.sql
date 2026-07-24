/*
  Warnings:

  - Added the required column `stream` to the `EnrollmentDrive` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EnrollmentDrive" ADD COLUMN     "stream" "Stream" NOT NULL;
