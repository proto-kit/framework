/*
  Warnings:

  - The primary key for the `State` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `mask` to the `State` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "State" DROP CONSTRAINT "State_pkey",
ADD COLUMN     "mask" VARCHAR(256) NOT NULL,
ALTER COLUMN "path" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "values" SET DATA TYPE DECIMAL(78,0)[],
ADD CONSTRAINT "State_pkey" PRIMARY KEY ("path", "mask");

-- CreateTable
CREATE TABLE "TreeElement" (
    "key" DECIMAL(78,0) NOT NULL,
    "level" SMALLINT NOT NULL,
    "value" DECIMAL(78,0) NOT NULL,

    CONSTRAINT "TreeElement_pkey" PRIMARY KEY ("key","level")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "hash" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "args" TEXT[],
    "signature_r" TEXT NOT NULL,
    "signature_s" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "TransactionExecutionResult" (
    "stateTransitions" JSON NOT NULL,
    "protocolTransitions" JSON NOT NULL,
    "status" BOOLEAN NOT NULL,
    "statusMessage" TEXT,
    "txHash" TEXT NOT NULL,
    "blockHash" TEXT NOT NULL,

    CONSTRAINT "TransactionExecutionResult_pkey" PRIMARY KEY ("txHash")
);

-- CreateTable
CREATE TABLE "Block" (
    "hash" TEXT NOT NULL,
    "transactionsHash" TEXT NOT NULL,
    "beforeNetworkState" JSON NOT NULL,
    "duringNetworkState" JSON NOT NULL,
    "height" INTEGER NOT NULL,
    "fromEternalTransactionsHash" TEXT NOT NULL,
    "toEternalTransactionsHash" TEXT NOT NULL,
    "fromBlockHashRoot" TEXT NOT NULL,
    "parentHash" TEXT,
    "batchHeight" INTEGER,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Batch" (
    "height" INTEGER NOT NULL,
    "proof" JSON NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("height")
);

-- CreateTable
CREATE TABLE "UnprovenBlockMetadata" (
    "blockHash" TEXT NOT NULL,
    "stateRoot" TEXT NOT NULL,
    "blockHashRoot" TEXT NOT NULL,
    "afterNetworkState" JSON NOT NULL,
    "blockStateTransitions" JSON NOT NULL,
    "blockHashWitness" JSON NOT NULL,

    CONSTRAINT "UnprovenBlockMetadata_pkey" PRIMARY KEY ("blockHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "Block_parentHash_key" ON "Block"("parentHash");

-- CreateIndex
CREATE UNIQUE INDEX "UnprovenBlockMetadata_blockHash_key" ON "UnprovenBlockMetadata"("blockHash");

-- AddForeignKey
ALTER TABLE "TransactionExecutionResult" ADD CONSTRAINT "TransactionExecutionResult_txHash_fkey" FOREIGN KEY ("txHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionExecutionResult" ADD CONSTRAINT "TransactionExecutionResult_blockHash_fkey" FOREIGN KEY ("blockHash") REFERENCES "Block"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_parentHash_fkey" FOREIGN KEY ("parentHash") REFERENCES "Block"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_batchHeight_fkey" FOREIGN KEY ("batchHeight") REFERENCES "Batch"("height") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnprovenBlockMetadata" ADD CONSTRAINT "UnprovenBlockMetadata_blockHash_fkey" FOREIGN KEY ("blockHash") REFERENCES "Block"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;
