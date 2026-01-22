/*
  Warnings:

  - You are about to drop the column `settlementTransactionHash` on the `Batch` table. All the data in the column will be lost.
  - The primary key for the `Settlement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `transactionHash` on the `Settlement` table. All the data in the column will be lost.
  - Added the required column `transactionId` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Batch" DROP CONSTRAINT "Batch_settlementTransactionHash_fkey";

-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "settlementTransactionHash",
ADD COLUMN     "settlementTransactionId" TEXT;

-- AlterTable
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_pkey",
DROP COLUMN "transactionHash",
ADD COLUMN     "transactionId" TEXT NOT NULL,
ADD CONSTRAINT "Settlement_pkey" PRIMARY KEY ("transactionId");

-- CreateTable
CREATE TABLE "PendingL1Transaction" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "transaction" JSON NOT NULL,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "PendingL1Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingL1Transaction_sender_nonce_key" ON "PendingL1Transaction"("sender", "nonce");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_settlementTransactionId_fkey" FOREIGN KEY ("settlementTransactionId") REFERENCES "Settlement"("transactionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PendingL1Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
