-- CreateTable
CREATE TABLE "SkippedTransactionInputPaths" (
    "transactionHash" TEXT NOT NULL,
    "paths" DECIMAL(78,0)[],

    CONSTRAINT "SkippedTransactionInputPaths_pkey" PRIMARY KEY ("transactionHash")
);

-- AddForeignKey
ALTER TABLE "SkippedTransactionInputPaths" ADD CONSTRAINT "SkippedTransactionInputPaths_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;
