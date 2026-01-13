/*
  Warnings:

  - You are about to drop the column `blockStateTransitions` on the `BlockResult` table. All the data in the column will be lost.
  - Added the required column `afterBlockStateTransitions` to the `BlockResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BlockResult" DROP COLUMN "blockStateTransitions",
ADD COLUMN     "afterBlockStateTransitions" JSON NOT NULL,
ADD COLUMN     "witnessedRoots" TEXT[];
