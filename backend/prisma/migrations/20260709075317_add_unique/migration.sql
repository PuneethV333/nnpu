/*
  Warnings:

  - A unique constraint covering the columns `[authId]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Auth_authId_key" ON "Auth"("authId");
