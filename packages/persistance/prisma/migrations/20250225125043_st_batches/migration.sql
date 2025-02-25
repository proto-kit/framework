/*
  Warnings:

  - You are about to drop the column `beforeBlockStateTransitions` on the `Block` table. All the data in the column will be lost.
  - You are about to drop the column `afterBlockStateTransitions` on the `BlockResult` table. All the data in the column will be lost.
  - You are about to drop the column `stateTransitions` on the `TransactionExecutionResult` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Block" DROP COLUMN "beforeBlockStateTransitions";

-- AlterTable
ALTER TABLE "BlockResult" DROP COLUMN "afterBlockStateTransitions";

-- AlterTable
ALTER TABLE "TransactionExecutionResult" DROP COLUMN "stateTransitions";

-- CreateTable
CREATE TABLE "StateTransition" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "from" TEXT[],
    "to" TEXT[],

    CONSTRAINT "StateTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateTransitionBatch" (
    "id" SERIAL NOT NULL,
    "txExecutionResultId" TEXT,
    "blockId" TEXT,
    "blockResultId" TEXT,
    "applied" BOOLEAN NOT NULL,

    CONSTRAINT "StateTransitionBatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StateTransition" ADD CONSTRAINT "StateTransition_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StateTransitionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateTransitionBatch" ADD CONSTRAINT "StateTransitionBatch_txExecutionResultId_fkey" FOREIGN KEY ("txExecutionResultId") REFERENCES "TransactionExecutionResult"("txHash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateTransitionBatch" ADD CONSTRAINT "StateTransitionBatch_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateTransitionBatch" ADD CONSTRAINT "StateTransitionBatch_blockResultId_fkey" FOREIGN KEY ("blockResultId") REFERENCES "BlockResult"("blockHash") ON DELETE SET NULL ON UPDATE CASCADE;
