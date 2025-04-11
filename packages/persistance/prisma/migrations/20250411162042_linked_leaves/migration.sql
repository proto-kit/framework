-- CreateTable
CREATE TABLE "LinkedLeaf" (
    "index" DECIMAL(78,0) NOT NULL,
    "path" DECIMAL(78,0) NOT NULL,
    "value" DECIMAL(78,0) NOT NULL,
    "nextPath" DECIMAL(78,0) NOT NULL,
    "mask" TEXT NOT NULL,

    CONSTRAINT "LinkedLeaf_pkey" PRIMARY KEY ("index","mask")
);

-- CreateIndex
CREATE INDEX "LinkedLeaf_index_idx" ON "LinkedLeaf"("index");

-- CreateIndex
CREATE INDEX "LinkedLeaf_path_idx" ON "LinkedLeaf"("path");

-- CreateIndex
CREATE INDEX "LinkedLeaf_nextPath_idx" ON "LinkedLeaf"("nextPath");

-- CreateIndex
CREATE INDEX "State_path_idx" ON "State" USING HASH ("path");

-- CreateIndex
CREATE INDEX "State_mask_path_idx" ON "State"("mask", "path");
