import {
  distinctByString,
  HistoricalUnprovenBlockStorage,
  TransactionExecutionResult,
  UnprovenBlock,
  UnprovenBlockMetadata,
  UnprovenBlockQueue,
  UnprovenBlockStorage,
  UnprovenBlockWithMetadata,
  UnprovenBlockWithPreviousMetadata,
} from "@proto-kit/sequencer";
import { filterNonNull, log } from "@proto-kit/common";
import {
  Prisma,
  TransactionExecutionResult as DBTransactionExecutionResult,
} from "@prisma/client";
import { inject, injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import {
  TransactionExecutionResultMapper,
  TransactionMapper,
} from "./mappers/TransactionMapper";
import { UnprovenBlockMetadataMapper } from "./mappers/UnprovenBlockMetadataMapper";
import { BlockMapper } from "./mappers/BlockMapper";

@injectable()
export class PrismaBlockStorage
  implements
    UnprovenBlockQueue,
    UnprovenBlockStorage,
    HistoricalUnprovenBlockStorage
{
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly transactionResultMapper: TransactionExecutionResultMapper,
    private readonly transactionMapper: TransactionMapper,
    private readonly blockMetadataMapper: UnprovenBlockMetadataMapper,
    private readonly blockMapper: BlockMapper
  ) {}

  private async getBlockByQuery(
    where: { height: number } | { hash: string }
  ): Promise<UnprovenBlockWithMetadata | undefined> {
    const result = await this.connection.prismaClient.block.findFirst({
      where,
      include: {
        transactions: {
          include: {
            tx: true,
          },
        },
        metadata: true,
      },
    });
    if (result === null) {
      return undefined;
    }
    const transactions = result.transactions.map<TransactionExecutionResult>(
      (txresult) => this.transactionResultMapper.mapIn([txresult, txresult.tx])
    );
    if (result.metadata === undefined || result.metadata === null) {
      throw new Error(
        `No Metadata has been set for block ${JSON.stringify(where)} yet`
      );
    }

    return {
      block: {
        ...this.blockMapper.mapIn(result),
        transactions,
      },
      metadata: this.blockMetadataMapper.mapIn(result.metadata),
    };
  }

  public async getBlockAt(height: number): Promise<UnprovenBlock | undefined> {
    return (await this.getBlockByQuery({ height }))?.block;
  }

  public async getBlock(hash: string): Promise<UnprovenBlock | undefined> {
    return (await this.getBlockByQuery({ hash }))?.block;
  }

  public async pushBlock(block: UnprovenBlock): Promise<void> {
    log.trace(
      "Pushing block to DB. Txs:",
      block.transactions.map((x) => x.tx.hash().toString())
    );

    const transactions = block.transactions.map<DBTransactionExecutionResult>(
      (tx) => {
        const encoded = this.transactionResultMapper.mapOut(tx);
        return {
          ...encoded[0],
          blockHash: block.hash.toString(),
        };
      }
    );

    const encodedBlock = this.blockMapper.mapOut(block);

    const { prismaClient } = this.connection;

    await prismaClient.$transaction([
      prismaClient.transaction.createMany({
        data: block.transactions.map((txr) =>
          this.transactionMapper.mapOut(txr.tx)
        ),
        skipDuplicates: true,
      }),

      prismaClient.block.create({
        data: {
          ...encodedBlock,
          beforeNetworkState:
            encodedBlock.beforeNetworkState as Prisma.InputJsonObject,
          duringNetworkState:
            encodedBlock.duringNetworkState as Prisma.InputJsonObject,

          transactions: {
            createMany: {
              data: transactions.map((tx) => {
                return {
                  status: tx.status,
                  statusMessage: tx.statusMessage,
                  txHash: tx.txHash,

                  stateTransitions:
                    tx.stateTransitions as Prisma.InputJsonArray,
                  protocolTransitions:
                    tx.protocolTransitions as Prisma.InputJsonArray,
                };
              }),
              skipDuplicates: true,
            },
          },

          batchHeight: undefined,
        },
      }),
    ]);
  }

  public async pushMetadata(metadata: UnprovenBlockMetadata): Promise<void> {
    const encoded = this.blockMetadataMapper.mapOut(metadata);

    await this.connection.prismaClient.unprovenBlockMetadata.create({
      data: {
        afterNetworkState: encoded.afterNetworkState as Prisma.InputJsonValue,
        blockHashWitness: encoded.blockHashWitness as Prisma.InputJsonValue,
        blockStateTransitions:
          encoded.blockStateTransitions as Prisma.InputJsonValue,

        stateRoot: encoded.stateRoot,
        blockHash: encoded.blockHash,
        blockHashRoot: encoded.blockHashRoot,
      },
    });
  }

  // TODO Phase out and replace with getLatestBlock().network.height
  public async getCurrentBlockHeight(): Promise<number> {
    const result = await this.connection.prismaClient.block.aggregate({
      _max: {
        height: true,
      },
    });
    // TODO I have no idea what this should give in case no blocks are in the DB. Document properly
    return (result?._max.height ?? -1) + 1;
  }

  public async getLatestBlock(): Promise<
    UnprovenBlockWithMetadata | undefined
  > {
    const latestBlock = await this.connection.prismaClient.$queryRaw<
      { hash: string }[]
    >`SELECT b1."hash" FROM "Block" b1 
        LEFT JOIN "Block" child ON child."parentHash" = b1."hash"
        WHERE child IS NULL LIMIT 1`;

    if (latestBlock.length === 0) {
      return undefined;
    }

    return await this.getBlockByQuery({
      hash: latestBlock[0].hash,
    });
  }

  public async getNewBlocks(): Promise<UnprovenBlockWithPreviousMetadata[]> {
    const blocks = await this.connection.prismaClient.block.findMany({
      where: {
        batch: null,
      },
      include: {
        transactions: {
          include: {
            tx: true,
          },
        },
      },
      orderBy: {
        height: Prisma.SortOrder.asc,
      },
    });

    const blockHashes = blocks
      .flatMap((block) => [block.parentHash, block.hash])
      .filter(filterNonNull)
      .filter(distinctByString);
    const metadata =
      await this.connection.prismaClient.unprovenBlockMetadata.findMany({
        where: {
          blockHash: {
            in: blockHashes,
          },
        },
      });

    return blocks.map((block, index) => {
      const transactions = block.transactions.map<TransactionExecutionResult>(
        (txresult) => {
          return this.transactionResultMapper.mapIn([txresult, txresult.tx]);
        }
      );
      const decodedBlock = this.blockMapper.mapIn(block);
      decodedBlock.transactions = transactions;

      const correspondingMetadata = metadata.find(
        (candidate) => candidate.blockHash === block.hash
      );

      if (correspondingMetadata === undefined) {
        throw new Error(`No Metadata has been set for block ${block.hash} yet`);
      }

      const parentMetadata = metadata.find(
        (candidate) => candidate.blockHash === block.parentHash
      );
      return {
        block: {
          block: decodedBlock,
          metadata: this.blockMetadataMapper.mapIn(correspondingMetadata),
        },
        lastBlockMetadata:
          parentMetadata !== undefined
            ? this.blockMetadataMapper.mapIn(parentMetadata)
            : undefined,
      };
    });
  }
}
