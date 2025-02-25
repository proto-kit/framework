import {
  HistoricalBlockStorage,
  TransactionExecutionResult,
  Block,
  BlockResult,
  BlockQueue,
  BlockStorage,
  BlockWithResult,
  BlockWithMaybeResult,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import {
  Prisma,
  TransactionExecutionResult as DBTransactionExecutionResult,
  StateTransition as DBStateTransition,
  StateTransitionBatch as DBStateTransitionBatch,
} from "@prisma/client";
import { inject, injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import {
  TransactionExecutionResultMapper,
  TransactionMapper,
} from "./mappers/TransactionMapper";
import { BlockResultMapper } from "./mappers/BlockResultMapper";
import { BlockMapper } from "./mappers/BlockMapper";
import {
  StateTransitionBatchArrayMapper,
  StateTransitionMapper,
  STBatchArrayMapOut1,
  STBatchArrayMapOut2,
} from "./mappers/StateTransitionMapper";

@injectable()
export class PrismaBlockStorage
  implements BlockQueue, BlockStorage, HistoricalBlockStorage
{
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly transactionResultMapper: TransactionExecutionResultMapper,
    private readonly transactionMapper: TransactionMapper,
    private readonly blockResultMapper: BlockResultMapper,
    private readonly blockMapper: BlockMapper,
    private readonly stateTransitionBatchMapper: StateTransitionBatchArrayMapper,
    private readonly stateTransitionMapper: StateTransitionMapper
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
            stateTransitionBatch: {
              include: {
                stateTransitions: true,
              },
            },
          },
        },
        stateTransitionBatch: {
          include: {
            stateTransitions: true,
          },
        },
        result: {
          include: {
            stateTransitionBatch: {
              include: {
                stateTransitions: true,
              },
            },
          },
        },
      },
    });
    if (dbResult === null) {
      return undefined;
    }
    const transactions = dbResult.transactions.map<TransactionExecutionResult>(
      (txresult) => {
        const txExecResult = this.transactionResultMapper.mapIn([
          txresult,
          txresult.tx,
        ]);
        const stBatch = txresult.stateTransitionBatch.map<
          [STBatchArrayMapOut1, STBatchArrayMapOut2]
        >((batch) => [{ applied: batch.applied }, batch.stateTransitions]);
        return {
          ...txExecResult,
          stateTransitions: this.stateTransitionBatchMapper.mapIn(stBatch),
        };
      }
    );

    return {
      block: {
        ...this.blockMapper.mapIn(dbResult),
        beforeBlockStateTransitions:
          // Each block should just have one batch of STs associated with it
          dbResult.stateTransitionBatch[0].stateTransitions.map((st) =>
            this.stateTransitionMapper.mapIn(st)
          ),
        transactions,
      },
      result: dbResult.result
        ? {
            ...this.blockResultMapper.mapIn(dbResult.result),
            afterBlockStateTransitions:
              // Each block should just have one batch of STs assoicated with it
              dbResult.stateTransitionBatch[0].stateTransitions.map((st) =>
                this.stateTransitionMapper.mapIn(st)
              ),
          }
        : undefined,
    };
  }

  public async getBlockAt(height: number): Promise<Block | undefined> {
    return (await this.getBlockByQuery({ height }))?.block;
  }

  public async getBlock(hash: string): Promise<Block | undefined> {
    return (await this.getBlockByQuery({ hash }))?.block;
  }

  public async pushBlock(block: Block): Promise<void> {
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

    await prismaClient.transaction.createMany({
      data: block.transactions.map((txr) =>
        this.transactionMapper.mapOut(txr.tx)
      ),
      skipDuplicates: true,
    });

    await prismaClient.block.create({
      data: {
        ...encodedBlock,
        beforeNetworkState:
          encodedBlock.beforeNetworkState as Prisma.InputJsonObject,
        duringNetworkState:
          encodedBlock.duringNetworkState as Prisma.InputJsonObject,
        stateTransitionBatch: {
          create: [
            {
              applied: true,
              stateTransitions: {
                createMany: {
                  data: block.beforeBlockStateTransitions.map((st) =>
                    this.stateTransitionMapper.mapOut(st)
                  ),
                },
              },
            },
          ],
        },
        transactions: {
          createMany: {
            data: transactions.map((tx) => {
              return {
                status: tx.status,
                statusMessage: tx.statusMessage,
                txHash: tx.txHash,
                events: tx.events as Prisma.InputJsonArray,
              };
            }),
            skipDuplicates: true,
          },
        },
        batchHeight: undefined,
      },
    });

    const stateTransitionBatches = block.transactions.flatMap((tx) => {
      const batches = this.stateTransitionBatchMapper.mapOut(
        tx.stateTransitions
      );
      const resultMapper = this.transactionResultMapper.mapOut(tx)[0];
      return batches.map((batch, index) => ({
        ...batch[0],
        txExecutionResultId: resultMapper.txHash,
        stateTransitions: batch[1],
      }));
    });

    await prismaClient.stateTransitionBatch.createMany({
      data: stateTransitionBatches.map((batch) => ({
        ...batch,
        stateTransition: {
          create: {
            data: batch.stateTransitions,
          },
        },
      })),
      skipDuplicates: false,
    });
  }

  public async pushResult(result: BlockResult): Promise<void> {
    const encoded = this.blockResultMapper.mapOut(result);
    const batches = this.stateTransitionBatchMapper.mapOut([
      { stateTransitions: result.afterBlockStateTransitions, applied: true },
    ]);

    await this.connection.prismaClient.blockResult.create({
      data: {
        afterNetworkState: encoded.afterNetworkState as Prisma.InputJsonValue,
        blockHashWitness: encoded.blockHashWitness as Prisma.InputJsonValue,
        stateTransitionBatch: {
          create: batches.map(([stBatch, sts]) => {
            return {
              ...stBatch,
              stateTransitions: {
                create: sts,
              },
            };
          }),
        },
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
          `Block result for block ${result.block.height.toString()} not found`
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
            stateTransitionBatch: {
              include: {
                stateTransitions: true,
              },
            },
          },
        },
        stateTransitionBatch: {
          include: {
            stateTransitions: true,
          },
        },
        result: {
          include: {
            stateTransitionBatch: {
              include: {
                stateTransitions: true,
              },
            },
          },
        },
      },
      orderBy: {
        height: Prisma.SortOrder.asc,
      },
    });

    return blocks.map((block, index) => {
      const transactions = block.transactions.map<TransactionExecutionResult>(
        (txresult) => {
          const txExecResult = this.transactionResultMapper.mapIn([
            txresult,
            txresult.tx,
          ]);
          const stBatch = txresult.stateTransitionBatch.map<
            [
              Omit<
                DBStateTransitionBatch,
                "txExecutionResultId" | "id" | "blockId" | "blockResultId"
              >,
              Omit<DBStateTransition, "batchId" | "id">[],
            ]
          >((batch) => [{ applied: batch.applied }, batch.stateTransitions]);
          return {
            ...txExecResult,
            stateTransitions: this.stateTransitionBatchMapper.mapIn(stBatch),
          };
        }
      );
      const decodedBlock = this.blockMapper.mapIn(block);
      decodedBlock.transactions = transactions;

      const { result } = block;

      if (result === null) {
        throw new Error(
          `No BlockResult has been set for block ${block.hash} yet`
        );
      }

      return {
        block: {
          ...decodedBlock,
          beforeBlockStateTransitions:
            block.stateTransitionBatch[0].stateTransitions.map((st) =>
              this.stateTransitionMapper.mapIn(st)
            ),
        },
        result: {
          ...this.blockResultMapper.mapIn(result),
          afterBlockStateTransitions:
            result.stateTransitionBatch[0].stateTransitions.map((st) =>
              this.stateTransitionMapper.mapIn(st)
            ),
        },
      };
    });
  }
}
