-- CreateTable
CREATE TABLE "TransactionPriority" (
    "transactionHash" TEXT NOT NULL,
    "priority" BIGINT NOT NULL,

    CONSTRAINT "TransactionPriority_pkey" PRIMARY KEY ("transactionHash")
);

-- AddForeignKey
ALTER TABLE "TransactionPriority" ADD CONSTRAINT "TransactionPriority_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;
