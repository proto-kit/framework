/*
  Warnings:

  - You are about to drop the column `protocolTransitions` on the `TransactionExecutionResult` table. All the data in the column will be lost.
  - Added the required column `hooksStatus` to the `TransactionExecutionResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TransactionExecutionResult" DROP COLUMN "protocolTransitions",
ADD COLUMN     "hooksStatus" BOOLEAN NOT NULL;
