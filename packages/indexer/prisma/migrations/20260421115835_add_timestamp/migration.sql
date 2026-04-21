/*
  Warnings:

  - Added the required column `createdAt` to the `Batch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `Block` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAt` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL;
