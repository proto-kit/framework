/*
  Warnings:

  - Added the required column `beforeBlockStateTransitions` to the `Block` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromStateRoot` to the `Block` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "beforeBlockStateTransitions" JSON NOT NULL,
ADD COLUMN     "fromStateRoot" TEXT NOT NULL;
