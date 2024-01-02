import { AsyncStateService } from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";
import { Prisma } from "@prisma/client";
import { noop } from "@proto-kit/common";

import type { PrismaDatabaseConnection } from "../../PrismaDatabaseConnection";

export class PrismaStateService implements AsyncStateService {
  private cache: [Field, Field[] | undefined][] = [];

  /**
   * @param connection
   * @param mask A indicator to which masking level the values belong
   */
  public constructor(
    private readonly connection: PrismaDatabaseConnection,
    private readonly mask: string = "base"
  ) {}

  public async commit(): Promise<void> {
    const { client } = this.connection;

    const data = this.cache
      .filter((entry) => entry[1] !== undefined)
      .map((entry) => ({
        path: new Prisma.Decimal(entry[0].toString()),
        values: entry[1]!.map((field) => new Prisma.Decimal(field.toString())),
        mask: this.mask,
      }));

    await client.$transaction([
      client.state.deleteMany({
        where: {
          path: {
            in: this.cache.map((x) => new Prisma.Decimal(x[0].toString())),
          },
        },
      }),
      client.state.createMany({
        data,
      }),
    ]);

    this.cache = [];
  }

  public async getAsync(key: Field): Promise<Field[] | undefined> {
    const record = await this.connection.client.state.findFirst({
      where: {
        AND: [
          {
            path: new Prisma.Decimal(key.toString()),
          },
          {
            mask: this.mask,
          },
        ],
      },
    });
    // x.toNumber() is safe, because we know that the actual DB-type
    // is a decimal with 0 decimal places
    return record?.values.map((x) => Field(x.toNumber())) ?? undefined;
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async setAsync(key: Field, value: Field[] | undefined): Promise<void> {
    this.cache.push([key, value]);
  }
}
