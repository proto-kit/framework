import {
  TransactionExecutionResult,
  Block,
  BlockResult,
  BlockQueue,
  BlockStorage,
  BlockWithResult,
  BlockWithMaybeResult,
  Tracer,
  trace,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
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
import { BlockResultMapper } from "./mappers/BlockResultMapper";
import { BlockMapper } from "./mappers/BlockMapper";

@injectable()
export class PrismaBlockStorage implements BlockQueue, BlockStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly transactionResultMapper: TransactionExecutionResultMapper,
    private readonly transactionMapper: TransactionMapper,
    private readonly blockResultMapper: BlockResultMapper,
    private readonly blockMapper: BlockMapper,
    @inject("Tracer") public readonly tracer: Tracer
  ) {}

  private async getBlockByQuery(
    where: { height: number } | { hash: string }
  ): Promise<BlockWithMaybeResult | undefined> {
    const dbResult = await this.connection.prismaClient.block.findFirst({
      where,
      include: {
        transactions: {
          include: {
            tx: true,
          },
        },
        result: true,
      },
    });
    if (dbResult === null) {
      return undefined;
    }
    const transactions =
      dbResult.transactions.map<TransactionExecutionResult>((txresult) =>
        this.transactionResultMapper.mapIn([txresult, txresult.tx])
      );

    return {
      block: {
        ...this.blockMapper.mapIn(dbResult),
        transactions,
      },
      result: dbResult.result
        ? this.blockResultMapper.mapIn(dbResult.result)
        : undefined,
    };
  }

  public async getBlockAt(height: number): Promise<Block | undefined> {
    return (await this.getBlockByQuery({ height }))?.block;
  }

  public async getBlock(hash: string): Promise<Block | undefined> {
    return (await this.getBlockByQuery({ hash }))?.block;
  }

  @trace("db.block.push", ([{ height }]) => ({ height: height.toString() }))
  public async pushBlock(block: Block): Promise<void> {
    log.trace(
      "Pushing block to DB. Txs:",
      block.transactions.map((x) => x.tx.hash)
    );

    const transactions = block.transactions.map<DBTransactionExecutionResult>(
      (tx) => {
        const encoded = this.transactionResultMapper.mapOut(tx);
        return {
          ...encoded[0],
          blockHash: block.hash,
        };
      }
    );

    const encodedBlock = this.blockMapper.mapOut(block);

    const { prismaClient } = this.connection;

    // Note: We can assume all transactions are already in the DB here, because the
    // mempool shares the same table as this one. But that could change in the future,
    // then transaction have to be inserted-if-missing
    // await prismaClient.transaction.createMany({
    //   data: block.transactions.map((txr) =>
    //     this.transactionMapper.mapOut(txr.tx)
    //   ),
    //   skipDuplicates: true,
    // });

    await prismaClient.block.create({
      data: {
        ...encodedBlock,
        beforeBlockStateTransitions:
          encodedBlock.beforeBlockStateTransitions as Prisma.InputJsonArray,
        beforeNetworkState:
          encodedBlock.beforeNetworkState as Prisma.InputJsonObject,
        duringNetworkState:
          encodedBlock.duringNetworkState as Prisma.InputJsonObject,

        transactions: {
          createMany: {
            data: transactions.map((tx) => {
              return {
                status: tx.status,
                hooksStatus: tx.hooksStatus,
                statusMessage: tx.statusMessage,
                txHash: tx.txHash,

                stateTransitions: tx.stateTransitions as Prisma.InputJsonArray,
                events: tx.events as Prisma.InputJsonArray,
              };
            }),
            skipDuplicates: true,
          },
        },

        batchHeight: undefined,
      },
    });
  }

  public async pushResult(result: BlockResult): Promise<void> {
    const encoded = this.blockResultMapper.mapOut(result);

    await this.connection.prismaClient.blockResult.create({
      data: {
        afterNetworkState: encoded.afterNetworkState as Prisma.InputJsonValue,
        blockHashWitness: encoded.blockHashWitness as Prisma.InputJsonValue,
        afterBlockStateTransitions:
          encoded.afterBlockStateTransitions as Prisma.InputJsonValue,

        stateRoot: encoded.stateRoot,
        blockHash: encoded.blockHash,
        blockHashRoot: encoded.blockHashRoot,
        witnessedRoots: encoded.witnessedRoots,
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

  public async getLatestBlockAndResult(): Promise<
    BlockWithMaybeResult | undefined
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

  public async getLatestBlock(): Promise<BlockWithResult | undefined> {
    const result = await this.getLatestBlockAndResult();
    if (result !== undefined) {
      if (result.result === undefined) {
        throw new Error(
          `Block result for block ${result.block.height} not found`
        );
      }
      return {
        block: result.block,
        result: result.result,
      };
    }
    return result;
  }

  public async getNewBlocks(): Promise<BlockWithResult[]> {
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
        result: true,
      },
      orderBy: {
        height: Prisma.SortOrder.asc,
      },
    });

    return blocks.map((block, index) => {
      const transactions =
        block.transactions.map<TransactionExecutionResult>((txresult) => {
          return this.transactionResultMapper.mapIn([txresult, txresult.tx]);
        });
      const decodedBlock = this.blockMapper.mapIn(block);
      decodedBlock.transactions = transactions;

      const { result } = block;

      if (result === null) {
        throw new Error(
          `No BlockResult has been set for block ${block.hash} yet`
        );
      }

      return {
        block: decodedBlock,
        result: this.blockResultMapper.mapIn(result),
      };
    });
  }
}
