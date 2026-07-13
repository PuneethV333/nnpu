/*
  Warnings:

  - A unique constraint covering the columns `[studentId,feeStructureId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Invoice_studentId_feeStructureId_key" ON "Invoice"("studentId", "feeStructureId");
