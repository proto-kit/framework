import {
  AsyncStateService,
  StateEntry,
  Tracer,
  trace,
} from "@proto-kit/sequencer";
import { Field } from "o1js";
import { Prisma } from "@prisma/client";
import { noop } from "@proto-kit/common";
import { injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import { readState } from "./sql/readState";
import { deleteCollisionsFromParentMask } from "./sql/deleteCollisionsFromParentMask";
import { mergeIntoParent } from "./sql/mergeIntoParent";

// We need to create a correctly configured Decimal constructor
// with our parameters
const Decimal = Prisma.Decimal.clone({
  precision: 78,
});

@injectable()
export class PrismaStateService implements AsyncStateService {
  private cache: StateEntry[] = [];

  private maskId?: number;

  /**
   * @param connection
   * @param tracer
   * @param mask A indicator to which masking level the values belong.
   * This name has to be unique
   * @param parent
   */
  public constructor(
    private readonly connection: PrismaConnection,
    public readonly tracer: Tracer,
    private readonly mask: string,
    private readonly parent?: number
  ) {}

  private async getMaskId(): Promise<number> {
    if (this.maskId === undefined) {
      this.maskId = await this.initializeMask(this.mask, this.parent);
    }
    return this.maskId;
  }

  private async initializeMask(mask: string, parent?: number): Promise<number> {
    const { prismaClient } = this.connection;

    const found = await prismaClient.mask.findFirst({
      where: {
        name: mask,
        parent,
      },
    });

    if (found === null) {
      const createdMask = await prismaClient.mask.create({
        data: {
          parent,
          name: mask,
        },
      });
      return createdMask.id;
    }
    return found.id;
  }

  @trace("db.state.commit")
  public async commit(): Promise<void> {
    const { prismaClient } = this.connection;

    const maskId = await this.getMaskId();

    const data = this.cache
      .filter((entry) => entry.value !== undefined)
      .map((entry) => ({
        path: new Decimal(entry.key.toString()),
        values: entry.value!.map((field) => new Decimal(field.toString())),
        maskId,
      }));

    await prismaClient.state.deleteMany({
      where: {
        path: {
          in: this.cache.map((x) => new Decimal(x.key.toString())),
        },
        maskId,
      },
    });
    await prismaClient.state.createMany({
      data,
    });

    this.cache = [];
  }

  public async getMany(keys: Field[]): Promise<StateEntry[]> {
    const maskId = await this.getMaskId();
    const paths = keys.map((key) => new Decimal(key.toString()));

    const records: {
      path: Prisma.Decimal;
      values: Prisma.Decimal[] | null;
    }[] = await this.connection.prismaClient.$queryRaw(
      readState(maskId, paths)
    );

    return records.map((record) => ({
      key: Field(record.path.toFixed()),
      // TODO Figure out why that is nullable
      value: record.values?.map((x) => Field(x.toFixed())) ?? [],
    }));
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async get(key: Field): Promise<Field[] | undefined> {
    const state = await this.getMany([key]);
    return state.at(-1)?.value;
  }

  public writeStates(entries: StateEntry[]): void {
    this.cache.push(...entries);
  }

  public async createMask(name: string): Promise<AsyncStateService> {
    const maskId = await this.getMaskId();
    return new PrismaStateService(this.connection, this.tracer, name, maskId);
  }

  public async mergeIntoParent(): Promise<void> {
    const maskId = await this.getMaskId();

    const client = this.connection.prismaClient;

    if (this.parent !== undefined) {
      // Rough strategy here:
      // 1. Delete all entries that are bound to be overwritten from the parent mask
      // 2. Update this mask's entries to parent mask id
      // 3. Re-link all children of this mask to this mask's parent
      // 4. Delete mask

      await client.$transaction([
        client.$queryRaw(deleteCollisionsFromParentMask(maskId)),
        // MergeIntoParent could be a prisma query, but it isn't, because eventually,
        // this Service should be stateless, therefore the parentId wouldn't be on hand
        // anymore, so we need to inline it's retrieval into the query
        client.$queryRaw(mergeIntoParent(maskId)),
        client.mask.updateMany({
          where: {
            parent: maskId,
          },
          data: {
            parent: this.parent,
          },
        }),
        client.mask.delete({
          where: {
            id: maskId,
          },
        }),
      ]);
    } else {
      throw new Error("Can't merge into parent without a parent");
    }
  }

  public async drop(): Promise<void> {
    const maskId = await this.getMaskId();

    await this.connection.prismaClient.state.deleteMany({
      where: {
        maskId,
      },
    });

    await this.connection.prismaClient.mask.delete({
      where: {
        id: maskId,
      },
    });
  }
}
