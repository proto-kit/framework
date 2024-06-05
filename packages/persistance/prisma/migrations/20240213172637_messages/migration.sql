/*
  Warnings:

  - You are about to drop the column `args` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `fromMessagesHash` to the `Block` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toMessagesHash` to the `Block` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isMessage` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "settlementTransactionHash" TEXT;

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "fromMessagesHash" TEXT NOT NULL,
ADD COLUMN     "toMessagesHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "args",
ADD COLUMN     "argsFields" TEXT[],
ADD COLUMN     "argsJSON" TEXT[],
ADD COLUMN     "isMessage" BOOLEAN NOT NULL;

-- CreateTable
CREATE TABLE "Settlement" (
    "transactionHash" TEXT NOT NULL,
    "promisedMessagesHash" TEXT NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("transactionHash")
);

-- CreateTable
CREATE TABLE "IncomingMessageBatchTransaction" (
    "transactionHash" TEXT NOT NULL,
    "batchId" INTEGER NOT NULL,

    CONSTRAINT "IncomingMessageBatchTransaction_pkey" PRIMARY KEY ("transactionHash","batchId")
);

-- CreateTable
CREATE TABLE "IncomingMessageBatch" (
    "id" SERIAL NOT NULL,
    "fromMessageHash" TEXT NOT NULL,
    "toMessageHash" TEXT NOT NULL,

    CONSTRAINT "IncomingMessageBatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_settlementTransactionHash_fkey" FOREIGN KEY ("settlementTransactionHash") REFERENCES "Settlement"("transactionHash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingMessageBatchTransaction" ADD CONSTRAINT "IncomingMessageBatchTransaction_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingMessageBatchTransaction" ADD CONSTRAINT "IncomingMessageBatchTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IncomingMessageBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
