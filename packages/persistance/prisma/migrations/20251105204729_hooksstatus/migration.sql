/*
  Warnings:

  - Added the required column `hooksStatus` to the `TransactionExecutionResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TransactionExecutionResult" ADD COLUMN     "hooksStatus" BOOLEAN NOT NULL;
