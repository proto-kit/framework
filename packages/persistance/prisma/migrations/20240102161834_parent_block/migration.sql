/*
  Warnings:

  - The primary key for the `UnprovenBlockMetadata` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `height` on the `UnprovenBlockMetadata` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[parentTransactionsHash]` on the table `Block` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[blockTransactionHash]` on the table `UnprovenBlockMetadata` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `blockTransactionHash` to the `UnprovenBlockMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "parentTransactionsHash" TEXT;

-- AlterTable
ALTER TABLE "UnprovenBlockMetadata" DROP CONSTRAINT "UnprovenBlockMetadata_pkey",
DROP COLUMN "height",
ADD COLUMN     "blockTransactionHash" TEXT NOT NULL,
ADD CONSTRAINT "UnprovenBlockMetadata_pkey" PRIMARY KEY ("blockTransactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "Block_parentTransactionsHash_key" ON "Block"("parentTransactionsHash");

-- CreateIndex
CREATE UNIQUE INDEX "UnprovenBlockMetadata_blockTransactionHash_key" ON "UnprovenBlockMetadata"("blockTransactionHash");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_parentTransactionsHash_fkey" FOREIGN KEY ("parentTransactionsHash") REFERENCES "Block"("transactionsHash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnprovenBlockMetadata" ADD CONSTRAINT "UnprovenBlockMetadata_blockTransactionHash_fkey" FOREIGN KEY ("blockTransactionHash") REFERENCES "Block"("transactionsHash") ON DELETE RESTRICT ON UPDATE CASCADE;
