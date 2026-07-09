/*
  Warnings:

  - A unique constraint covering the columns `[classId,combinationId,language,session,academicYearId]` on the table `Section` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `combinationId` to the `Section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `Section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session` to the `Section` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Stream" AS ENUM ('Science', 'Commerce');

-- CreateEnum
CREATE TYPE "SecondLanguage" AS ENUM ('Kannada', 'Hindi', 'Sanskrit');

-- CreateEnum
CREATE TYPE "Code" AS ENUM ('PCMB', 'PCMC', 'CEBA', 'SEBA');

-- DropIndex
DROP INDEX "Section_classId_name_academicYearId_key";

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "combinationId" TEXT NOT NULL,
ADD COLUMN     "language" "SecondLanguage" NOT NULL,
ADD COLUMN     "session" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Combination" (
    "id" TEXT NOT NULL,
    "stream" "Stream" NOT NULL,
    "code" "Code" NOT NULL,
    "idCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Combination_stream_idCode_key" ON "Combination"("stream", "idCode");

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_combinationId_language_session_academicYear_key" ON "Section"("classId", "combinationId", "language", "session", "academicYearId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "Combination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
