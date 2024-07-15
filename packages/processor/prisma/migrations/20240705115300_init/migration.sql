-- CreateTable
CREATE TABLE "Balance" (
    "height" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "balance" TEXT NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("height")
);
