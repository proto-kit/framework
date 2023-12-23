import {
  HistoricalUnprovenBlockStorage,
  TransactionExecutionResult,
  UnprovenBlock,
  UnprovenBlockMetadata,
  UnprovenBlockQueue,
  UnprovenBlockStorage,
  UnprovenBlockWithPreviousMetadata,
} from "@proto-kit/sequencer";
import { PrismaDatabaseConnection } from "../../PrismaDatabaseConnection";
import { TransactionExecutionResultMapper } from "./mappers/TransactionMapper";
import {
  Prisma,
  TransactionExecutionResult as DBTransactionExecutionResult,
} from "@prisma/client";
import { UnprovenBlockMetadataMapper } from "./mappers/UnprovenBlockMetadataMapper";
import { BlockMapper } from "./mappers/BlockMapper";

export class PrismaUnprovenBlockQueue
  implements
    UnprovenBlockQueue,
    UnprovenBlockStorage,
    HistoricalUnprovenBlockStorage
{
  public constructor(
    private readonly connection: PrismaDatabaseConnection,
    private readonly transactionResultMapper: TransactionExecutionResultMapper,
    private readonly blockMetadataMapper: UnprovenBlockMetadataMapper,
    private readonly blockMapper: BlockMapper
  ) {}

  public async getBlockAt(height: number): Promise<UnprovenBlock | undefined> {
    const result = await this.connection.client.block.findFirst({
      where: {
        height,
      },
      include: {
        transactions: {
          include: {
            tx: true,
          },
        },
      },
    });
    if (result === null) {
      return undefined;
    }
    const transactions = result.transactions.map<TransactionExecutionResult>(
      (txresult) => {
        return this.transactionResultMapper.mapIn([txresult, txresult.tx]);
      }
    );
    return {
      ...this.blockMapper.mapIn(result),
      transactions,
    };
  }

  public async pushBlock(block: UnprovenBlock): Promise<void> {
    const transactions = block.transactions.map<DBTransactionExecutionResult>(
      (tx) => {
        const encoded = this.transactionResultMapper.mapOut(tx);
        return {
          ...encoded[0],
          blockHash: block.transactionsHash.toString(),
        };
      }
    );

    const encodedBlock = this.blockMapper.mapOut(block);

    const result = await this.connection.client.block.create({
      data: {
        ...encodedBlock,
        networkState: encodedBlock.networkState as Prisma.InputJsonValue,

        transactions: {
          createMany: {
            data: transactions.map((tx) => {
              return {
                ...tx,
                stateTransitions: tx.stateTransitions as Prisma.InputJsonValue,
                protocolTransitions:
                  tx.protocolTransitions as Prisma.InputJsonValue,
              };
            }),
          },
        },

        batchHeight: undefined,
      },
    });
  }

  public async pushMetadata(metadata: UnprovenBlockMetadata): Promise<void> {
    // TODO Save this DB trip
    const height = await this.getCurrentBlockHeight();

    const encoded = this.blockMetadataMapper.mapOut(metadata);

    await this.connection.client.unprovenBlockMetadata.create({
      data: {
        resultingNetworkState:
          encoded.resultingNetworkState as Prisma.InputJsonValue,

        resultingStateRoot: encoded.resultingStateRoot,
        height: height - 1,
      },
    });
  }

  public async getCurrentBlockHeight(): Promise<number> {
    const result = await this.connection.client.block.aggregate({
      _max: {
        height: true,
      },
    });
    // TODO I have no idea what this should give in case no block are in the DB. Document properly
    return (result?._max.height ?? -1) + 1;
  }

  public async getLatestBlock(): Promise<UnprovenBlock | undefined> {
    const height = await this.getCurrentBlockHeight();
    if (height > 0) {
      return await this.getBlockAt(height - 1);
    }
    return undefined;
  }

  public async getNewestMetadata(): Promise<UnprovenBlockMetadata | undefined> {
    const height = await this.getCurrentBlockHeight();

    const result = await this.connection.client.unprovenBlockMetadata.findFirst(
      {
        where: {
          height,
        },
      }
    );

    if (result === null) {
      return undefined;
    }

    return this.blockMetadataMapper.mapIn(result);
  }

  public async getNewBlocks(): Promise<UnprovenBlockWithPreviousMetadata[]> {
    const blocks = await this.connection.client.block.findMany({
      where: {
        // eslint-disable-next-line unicorn/no-null
        batch: null,
      },
      orderBy: {
        height: Prisma.SortOrder.asc,
      },
    });

    const minUnbatchedBlock = blocks
      .map((b) => b.height)
      .reduce((a, b) => (a < b ? a : b));

    const metadata =
      await this.connection.client.unprovenBlockMetadata.findMany({
        where: {
          height: {
            gte: minUnbatchedBlock,
          },
        },
      });

    return blocks.map((block, index) => {
      const correspondingMetadata = metadata.find(
        (entry) => entry.height == block.height - 1
      );
      return {
        block: this.blockMapper.mapIn(block),
        lastBlockMetadata:
          correspondingMetadata !== undefined
            ? this.blockMetadataMapper.mapIn(correspondingMetadata)
            : undefined,
      };
    });
  }
}
