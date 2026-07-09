/*
  Warnings:

  - You are about to drop the column `noBoys` on the `School` table. All the data in the column will be lost.
  - You are about to drop the column `noGirls` on the `School` table. All the data in the column will be lost.
  - Added the required column `noOfBoys` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noOfGirls` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noOfTeacher` to the `School` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `noOfStudents` on the `School` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `schoolId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "School" DROP COLUMN "noBoys",
DROP COLUMN "noGirls",
ADD COLUMN     "noOfBoys" INTEGER NOT NULL,
ADD COLUMN     "noOfGirls" INTEGER NOT NULL,
ADD COLUMN     "noOfTeacher" INTEGER NOT NULL,
DROP COLUMN "noOfStudents",
ADD COLUMN     "noOfStudents" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
