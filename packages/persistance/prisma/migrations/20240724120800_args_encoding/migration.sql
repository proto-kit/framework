/*
  Warnings:

  - You are about to drop the column `argsJSON` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BlockResult" RENAME CONSTRAINT "UnprovenBlockMetadata_pkey" TO "BlockResult_pkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "argsJSON",
ADD COLUMN     "auxiliaryData" TEXT[];

-- RenameIndex
ALTER INDEX "UnprovenBlockMetadata_blockHash_key" RENAME TO "BlockResult_blockHash_key";
