/*
  Warnings:

  - Added the required column `events` to the `TransactionExecutionResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TransactionExecutionResult" ADD COLUMN     "events" JSON NOT NULL;
