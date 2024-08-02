import {
  Batch,
  HistoricalBatchStorage,
  BatchStorage,
} from "@proto-kit/sequencer";
import { Prisma } from "@prisma/client";
import { inject, injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import { BatchMapper } from "./mappers/BatchMapper";

@injectable()
export class PrismaBatchStore implements BatchStorage, HistoricalBatchStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly batchMapper: BatchMapper
  ) {}

  public async getBatchAt(height: number): Promise<Batch | undefined> {
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

  public async getCurrentBatchHeight(): Promise<number> {
    const batch = await this.connection.prismaClient.batch.aggregate({
      _max: {
        height: true,
      },
    });
    return (batch?._max.height ?? -1) + 1;
  }

  public async pushBatch(batch: Batch): Promise<void> {
    const height = await this.getCurrentBatchHeight();

    const [entity] = this.batchMapper.mapOut(batch);
    await this.connection.prismaClient.batch.create({
      data: {
        proof: entity.proof as Prisma.InputJsonValue,
        height,
        blocks: {
          connect: batch.blockHashes.map((hash) => ({
            hash,
          })),
        },
      },
      include: {
        blocks: true,
      },
    });
  }

  public async getLatestBatch(): Promise<Batch | undefined> {
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
