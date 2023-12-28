import { ProvenBatchStorage } from "@proto-kit/sequencer/dist/storage/repositories/ProvenBatchStorage";
import { ComputedBlock, HistoricalBlockStorage } from "@proto-kit/sequencer";
import { Prisma } from "@prisma/client";

import { PrismaDatabaseConnection } from "../../PrismaDatabaseConnection";

import { BatchMapper } from "./mappers/BatchMapper";

export class PrismaBatchStore
  implements ProvenBatchStorage, HistoricalBlockStorage
{
  public constructor(
    private readonly connection: PrismaDatabaseConnection,
    private readonly batchMapper: BatchMapper
  ) {}

  public async getBlockAt(height: number): Promise<ComputedBlock | undefined> {
    const batch = await this.connection.client.batch.findFirst({
      where: {
        height,
      },
      include: {
        blocks: {
          select: {
            transactionsHash: true,
          },
        },
      },
    });

    if (batch === null) {
      return undefined;
    }

    const blocks = batch.blocks.map((block) => block.transactionsHash);
    return this.batchMapper.mapIn([batch, blocks]);
  }

  public async getCurrentHeight(): Promise<number> {
    const batch = await this.connection.client.batch.aggregate({
      _max: {
        height: true,
      },
    });
    return (batch?._max.height ?? -1) + 1;
  }

  public async pushBlock(block: ComputedBlock): Promise<void> {
    const height = await this.getCurrentHeight();

    const [entity] = this.batchMapper.mapOut(block);
    await this.connection.client.batch.create({
      data: {
        proof: entity.proof as Prisma.InputJsonValue,
        height,
        blocks: {
          connect: block.bundles.map((transactionsHash) => ({
            transactionsHash,
          })),
        },
      },
      include: {
        blocks: true,
      },
    });
  }
}
