import { BasePrismaClient } from "../handlers/BasePrismaClient";

export interface PrismaDatabaseConnection<
  PrismaClient extends BasePrismaClient,
> {
  prismaClient: PrismaClient;
}
