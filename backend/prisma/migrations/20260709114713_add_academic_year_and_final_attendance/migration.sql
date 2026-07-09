/*
  Warnings:

  - A unique constraint covering the columns `[classId,name,academicYearId]` on the table `Section` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academicYearId` to the `Section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SectionSubject` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Section_classId_name_key";

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "academicYearId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SectionSubject" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_label_key" ON "AcademicYear"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_name_academicYearId_key" ON "Section"("classId", "name", "academicYearId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
