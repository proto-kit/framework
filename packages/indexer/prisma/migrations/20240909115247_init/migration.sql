-- CreateTable
CREATE TABLE "State" (
    "path" DECIMAL(78,0) NOT NULL,
    "values" DECIMAL(78,0)[],
    "mask" VARCHAR(256) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("path","mask")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "hash" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "argsFields" TEXT[],
    "auxiliaryData" TEXT[],
    "signature_r" TEXT NOT NULL,
    "signature_s" TEXT NOT NULL,
    "isMessage" BOOLEAN NOT NULL,

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
    "fromMessagesHash" TEXT NOT NULL,
    "toMessagesHash" TEXT NOT NULL,
    "parentHash" TEXT,
    "batchHeight" INTEGER,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Batch" (
    "height" INTEGER NOT NULL,
    "proof" JSON NOT NULL,
    "settlementTransactionHash" TEXT,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("height")
);

-- CreateTable
CREATE TABLE "BlockResult" (
    "blockHash" TEXT NOT NULL,
    "stateRoot" TEXT NOT NULL,
    "blockHashRoot" TEXT NOT NULL,
    "afterNetworkState" JSON NOT NULL,
    "blockStateTransitions" JSON NOT NULL,
    "blockHashWitness" JSON NOT NULL,

    CONSTRAINT "BlockResult_pkey" PRIMARY KEY ("blockHash")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "Block_parentHash_key" ON "Block"("parentHash");

-- CreateIndex
CREATE UNIQUE INDEX "BlockResult_blockHash_key" ON "BlockResult"("blockHash");

-- AddForeignKey
ALTER TABLE "TransactionExecutionResult" ADD CONSTRAINT "TransactionExecutionResult_txHash_fkey" FOREIGN KEY ("txHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionExecutionResult" ADD CONSTRAINT "TransactionExecutionResult_blockHash_fkey" FOREIGN KEY ("blockHash") REFERENCES "Block"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_parentHash_fkey" FOREIGN KEY ("parentHash") REFERENCES "Block"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_batchHeight_fkey" FOREIGN KEY ("batchHeight") REFERENCES "Batch"("height") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_settlementTransactionHash_fkey" FOREIGN KEY ("settlementTransactionHash") REFERENCES "Settlement"("transactionHash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockResult" ADD CONSTRAINT "BlockResult_blockHash_fkey" FOREIGN KEY ("blockHash") REFERENCES "Block"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingMessageBatchTransaction" ADD CONSTRAINT "IncomingMessageBatchTransaction_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingMessageBatchTransaction" ADD CONSTRAINT "IncomingMessageBatchTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IncomingMessageBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
