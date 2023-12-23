import { PrismaClient } from "@prisma/client";

export class PrismaDatabaseConnection {
  public readonly client = new PrismaClient();
}
