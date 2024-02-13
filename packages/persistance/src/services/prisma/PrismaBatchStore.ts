import {
  ComputedBlock,
  HistoricalBlockStorage,
  BlockStorage,
} from "@proto-kit/sequencer";
import { Prisma } from "@prisma/client";
import { inject, injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import { BatchMapper } from "./mappers/BatchMapper";

@injectable()
export class PrismaBatchStore implements BlockStorage, HistoricalBlockStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly batchMapper: BatchMapper
  ) {}

  public async getBlockAt(height: number): Promise<ComputedBlock | undefined> {
    const batch = await this.connection.prismaClient.batch.findFirst({
      where: {
        height,
      },
      include: {
        blocks: {
          select: {
            hash: true,
          },
        },
      },
    });

    if (batch === null) {
      return undefined;
    }

    const blocks = batch.blocks.map((block) => block.hash);
    return this.batchMapper.mapIn([batch, blocks]);
  }

  public async getCurrentBlockHeight(): Promise<number> {
    const batch = await this.connection.prismaClient.batch.aggregate({
      _max: {
        height: true,
      },
    });
    return (batch?._max.height ?? -1) + 1;
  }

  public async pushBlock(block: ComputedBlock): Promise<void> {
    const height = await this.getCurrentBlockHeight();

    const [entity] = this.batchMapper.mapOut(block);
    await this.connection.prismaClient.batch.create({
      data: {
        proof: entity.proof as Prisma.InputJsonValue,
        height,
        blocks: {
          connect: block.bundles.map((hash) => ({
            hash,
          })),
        },
      },
      include: {
        blocks: true,
      },
    });
  }

  public async getLatestBlock(): Promise<ComputedBlock | undefined> {
    const batch = await this.connection.prismaClient.batch.findFirst({
      orderBy: {
        height: Prisma.SortOrder.desc,
      },
      include: {
        blocks: {
          select: {
            hash: true,
          },
        },
      },
      take: 1,
    });
    if (batch === null) {
      return undefined;
    }
    return this.batchMapper.mapIn([
      batch,
      batch.blocks.map((block) => block.hash),
    ]);
  }
}
