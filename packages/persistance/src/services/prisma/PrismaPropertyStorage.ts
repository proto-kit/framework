import { PropertyStorage } from "@proto-kit/sequencer";
import { inject } from "tsyringe";

import { PrismaConnection } from "../../PrismaDatabaseConnection";

export class PrismaPropertyStorage implements PropertyStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection
  ) {}

  public async get(key: string): Promise<string | undefined> {
    const record = await this.connection.prismaClient.property.findFirst({
      where: {
        key,
      },
    });

    return record?.value;
  }

  public async set(key: string, value: string): Promise<void> {
    await this.connection.prismaClient.property.create({
      data: {
        key,
        value,
      },
    });
  }
}
