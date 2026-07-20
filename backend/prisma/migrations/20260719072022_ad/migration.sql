-- DropIndex
DROP INDEX "TimetableSlot_sectionId_day_idx";

-- DropIndex
DROP INDEX "TimetableSlot_sectionId_day_periodId_key";

-- AlterTable
ALTER TABLE "TimetableSlot" ADD COLUMN     "combinationId" TEXT,
ADD COLUMN     "language" "SecondLanguage";

-- CreateIndex
CREATE INDEX "TimetableSlot_sectionId_day_periodId_idx" ON "TimetableSlot"("sectionId", "day", "periodId");

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "Combination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
