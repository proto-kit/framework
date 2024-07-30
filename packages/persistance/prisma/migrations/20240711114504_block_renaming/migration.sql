/*
  Warnings:

  - You are about to drop the `TreeElement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UnprovenBlockMetadata` table. If the table is not empty, all the data it contains will be lost.

*/

-- DropTable
DROP TABLE "TreeElement";

-- DropForeignKey
ALTER TABLE "UnprovenBlockMetadata" DROP CONSTRAINT "UnprovenBlockMetadata_blockHash_fkey";

-- Rename Table
ALTER TABLE "UnprovenBlockMetadata" RENAME TO "BlockResult";

-- AddForeignKey
ALTER TABLE "BlockResult" ADD CONSTRAINT "BlockResult_blockHash_fkey" FOREIGN KEY ("blockHash") REFERENCES "Block"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;
