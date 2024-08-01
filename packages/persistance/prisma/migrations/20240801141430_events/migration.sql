/*
  Warnings:

  - Added the required column `events` to the `TransactionExecutionResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BlockResult" RENAME CONSTRAINT "UnprovenBlockMetadata_pkey" TO "BlockResult_pkey";

-- AlterTable
ALTER TABLE "TransactionExecutionResult" ADD COLUMN     "events" JSON NOT NULL;

-- RenameIndex
ALTER INDEX "UnprovenBlockMetadata_blockHash_key" RENAME TO "BlockResult_blockHash_key";
