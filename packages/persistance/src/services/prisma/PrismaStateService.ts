import { AsyncStateService } from "@proto-kit/sequencer";
import { Field } from "o1js";
import { PrismaDatabaseConnection } from "../../PrismaDatabaseConnection";

export class PrismaStateService implements AsyncStateService {
  private cache: [Field, Field[] | undefined][] = [];

  public constructor(private readonly connection: PrismaDatabaseConnection) {}

  public async commit(): Promise<void> {
    const { client } = this.connection;

    const data = this.cache
      .filter((entry) => entry[1] !== undefined)
      .map((entry) => {
        return {
          path: entry[0].toBigInt(),
          values: entry[1]!.map((field) => field.toBigInt()),
        };
      });

    await client.$transaction([
      client.state.deleteMany({
        where: {
          path: {
            in: this.cache.map((x) => x[0].toBigInt()),
          },
        },
      }),
      client.state.createMany({
        data,
      }),
    ]);

    // const removeKeys = this.cache
    //   .filter((x) => x[1] === undefined)
    //   .map((x) => x[0]);
    //
    // if (removeKeys.length > 0) {
    //   await this.client.client.state.deleteMany({
    //     where: {
    //       path: {
    //         in: removeKeys.map((x) => x.toBigInt()),
    //       },
    //     },
    //   });
    // }

    this.cache = [];
  }

  public async getAsync(key: Field): Promise<Field[] | undefined> {
    const record = await this.connection.client.state.findFirst({
      where: {
        path: key.toBigInt(),
      },
    });
    return record?.values.map((x) => Field(x)) ?? undefined;
  }

  public async openTransaction(): Promise<void> {}

  public async setAsync(key: Field, value: Field[] | undefined): Promise<void> {
    this.cache.push([key, value]);
  }
}
