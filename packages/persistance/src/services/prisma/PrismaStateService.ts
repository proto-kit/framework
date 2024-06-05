import { AsyncStateService, StateEntry } from "@proto-kit/sequencer";
import { Field } from "o1js";
import { Prisma } from "@prisma/client";
import { noop } from "@proto-kit/common";
import { injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

// We need to create a correctly configured Decimal constructor
// with our parameters
const Decimal = Prisma.Decimal.clone({
  precision: 78,
});

@injectable()
export class PrismaStateService implements AsyncStateService {
  private cache: StateEntry[] = [];

  /**
   * @param connection
   * @param mask A indicator to which masking level the values belong
   */
  public constructor(
    private readonly connection: PrismaConnection,
    private readonly mask: string
  ) {}

  public async commit(): Promise<void> {
    const { prismaClient } = this.connection;

    const data = this.cache
      .filter((entry) => entry.value !== undefined)
      .map((entry) => ({
        path: new Decimal(entry.key.toString()),
        values: entry.value!.map((field) => new Decimal(field.toString())),
        mask: this.mask,
      }));

    await prismaClient.$transaction([
      prismaClient.state.deleteMany({
        where: {
          path: {
            in: this.cache.map((x) => new Decimal(x.key.toString())),
          },
          mask: this.mask,
        },
      }),
      prismaClient.state.createMany({
        data,
      }),
    ]);

    this.cache = [];
  }

  public async getAsync(keys: Field[]): Promise<StateEntry[]> {
    const records = await this.connection.prismaClient.state.findMany({
      where: {
        AND: [
          {
            path: {
              in: keys.map((key) => new Decimal(key.toString())),
            },
          },
          {
            mask: this.mask,
          },
        ],
      },
    });
    return records.map((record) => ({
      key: Field(record.path.toFixed()),
      value: record.values.map((x) => Field(x.toFixed())),
    }));
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async getSingleAsync(key: Field): Promise<Field[] | undefined> {
    const state = await this.getAsync([key]);
    return state.at(-1)?.value;
  }

  public writeStates(entries: StateEntry[]): void {
    this.cache.push(...entries);
  }
}
