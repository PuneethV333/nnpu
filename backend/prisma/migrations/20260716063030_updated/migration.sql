/*
  Warnings:

  - You are about to drop the column `combinationId` on the `Section` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `Section` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[classId,session,academicYearId]` on the table `Section` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_combinationId_fkey";

-- DropIndex
DROP INDEX "Section_classId_combinationId_language_session_academicYear_key";

-- AlterTable
ALTER TABLE "Section" DROP COLUMN "combinationId",
DROP COLUMN "language";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "combinationId" TEXT,
ADD COLUMN     "language" "SecondLanguage";

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_session_academicYearId_key" ON "Section"("classId", "session", "academicYearId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "Combination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
