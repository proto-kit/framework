-- CreateTable
CREATE TABLE "State" (
    "path" BIGINT NOT NULL,
    "values" BIGINT[],

    CONSTRAINT "State_pkey" PRIMARY KEY ("path")
);
