/*
  Warnings:

  - The primary key for the `State` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `mask` on the `State` table. All the data in the column will be lost.
  - Added the required column `maskId` to the `State` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
TRUNCATE TABLE "State";
ALTER TABLE "State" DROP CONSTRAINT "State_pkey",
DROP COLUMN "mask",
ADD COLUMN     "maskId" INTEGER NOT NULL,
ADD CONSTRAINT "State_pkey" PRIMARY KEY ("path", "maskId");

-- CreateTable
CREATE TABLE "Mask" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "parent" INTEGER,

    CONSTRAINT "Mask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_maskId_fkey" FOREIGN KEY ("maskId") REFERENCES "Mask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mask" ADD CONSTRAINT "Mask_parent_fkey" FOREIGN KEY ("parent") REFERENCES "Mask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
