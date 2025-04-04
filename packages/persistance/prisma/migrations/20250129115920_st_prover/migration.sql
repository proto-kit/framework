/*
  Warnings:

  - You are about to drop the column `blockStateTransitions` on the `BlockResult` table. All the data in the column will be lost.
  - You are about to drop the column `protocolTransitions` on the `TransactionExecutionResult` table. All the data in the column will be lost.
  - Added the required column `beforeBlockStateTransitions` to the `Block` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromStateRoot` to the `Block` table without a default value. This is not possible if the table is not empty.
  - Added the required column `afterBlockStateTransitions` to the `BlockResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "beforeBlockStateTransitions" JSON NOT NULL,
ADD COLUMN     "fromStateRoot" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BlockResult" DROP COLUMN "blockStateTransitions",
ADD COLUMN     "afterBlockStateTransitions" JSON NOT NULL,
ADD COLUMN     "witnessedRoots" TEXT[];

-- AlterTable
ALTER TABLE "TransactionExecutionResult" DROP COLUMN "protocolTransitions";
