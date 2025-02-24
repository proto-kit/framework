import { BlockWithResult } from "@proto-kit/sequencer";
import {
  Block as PrismaBlock,
  BlockResult as PrismaBlockResult,
  Transaction as PrismaTransaction,
  TransactionExecutionResult as PrismaTransactionExecutionResult,
  StateTransition as PrismaStateTransition,
  StateTransitionBatch as PrismaStateTransitionBatch,
} from "@prisma/client";
import {
  BlockMapper,
  BlockResultMapper,
  TransactionExecutionResultMapper,
  StateTransitionMapper,
  StateTransitionBatchArrayMapper,
  STBatchArrayMapOut1,
  STBatchArrayMapOut2,
} from "@proto-kit/persistance";
import { log } from "@proto-kit/common";
import { injectable } from "tsyringe";
import { Provable } from "o1js";

import { ProcessorModule } from "../ProcessorModule";

export interface BlockFetchingConfig {
  url: string;
}

export interface BlockResponse {
  data: {
    findFirstBlock: PrismaBlock & {
      stateTransitionBatch: (PrismaStateTransitionBatch & {
        stateTransitions: PrismaStateTransition[];
      })[];
      result: PrismaBlockResult & {
        stateTransitionBatch: (PrismaStateTransitionBatch & {
          stateTransitions: PrismaStateTransition[];
        })[];
      };
    } & {
      transactions: (PrismaTransactionExecutionResult & {
        tx: PrismaTransaction;
        stateTransitionBatch: (PrismaStateTransitionBatch & {
          stateTransitions: PrismaStateTransition[];
        })[];
      })[];
    };
  };
}

@injectable()
export class BlockFetching extends ProcessorModule<BlockFetchingConfig> {
  public constructor(
    public blockMapper: BlockMapper,
    public blockResultMapper: BlockResultMapper,
    public transactionResultMapper: TransactionExecutionResultMapper,
    private readonly stateTransitionBatchMapper: StateTransitionBatchArrayMapper,
    private readonly stateTransitionMapper: StateTransitionMapper
  ) {
    super();
  }

  public async fetchBlock(
    height: number
  ): Promise<BlockWithResult | undefined> {
    const response = await fetch(`${this.config.url}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
          findFirstBlock(where: { height: { equals: ${height}}}) {              
            hash,
            height,
            beforeNetworkState
            duringNetworkState,
            fromEternalTransactionsHash
            toEternalTransactionsHash
            fromBlockHashRoot
            fromMessagesHash
            toMessagesHash
            transactionsHash
            stateTransitionBatch {
              applied,
              stateTransition {
                path,
                from,    
                to,      
              }
            }
            parent {
              hash
            }
            result {
              afterNetworkState,
              stateRoot,
              blockHashRoot,
              blockHashWitness,
              blockStateTransitions,
              blockHash,
              stateTransitionBatch {
                stateTransition {
                  path,
                  from,    
                  to,      
                }
              }
            }
            transactions {
              stateTransitions
              protocolTransitions
              status
              statusMessage
              events
              stateTransitionBatch {
                stateTransition {
                  path,
                  from,    
                  to,      
                }
              }
              tx {
                hash
                methodId
                sender
                nonce
                argsFields
                auxiliaryData
                signature_r
                signature_s
                isMessage
              }
            }
        }
        }`,
      }),
    });

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsedResponse = (await response.json()) as BlockResponse | null;

    log.debug("Fetched data from the indexer", parsedResponse);

    // TODO: type graphql response properly, along with the transformation to the mapper input types
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parsedResponse!.data.findFirstBlock) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      parsedResponse!.data.findFirstBlock.parentHash =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (parsedResponse?.data.findFirstBlock as any)?.parent?.hash ?? null;
    }

    if (!parsedResponse?.data.findFirstBlock) {
      return undefined;
    }

    const block = {
      ...this.blockMapper.mapIn(parsedResponse?.data.findFirstBlock),
      beforeBlockStateTransitions:
        parsedResponse.data.findFirstBlock.stateTransitionBatch[0].stateTransitions.map(
          (st) => this.stateTransitionMapper.mapIn(st)
        ),
    };
    const result = {
      ...this.blockResultMapper.mapIn(
        parsedResponse?.data.findFirstBlock.result
      ),
      afterBlockStateTransitions:
        parsedResponse.data.findFirstBlock.result.stateTransitionBatch[0].stateTransitions.map(
          (st) => this.stateTransitionMapper.mapIn(st)
        ),
    };

    const transactions = parsedResponse?.data.findFirstBlock.transactions.map(
      (tx) => {
        const txMapped = this.transactionResultMapper.mapIn([tx, tx.tx]);
        const stBatch = tx.stateTransitionBatch.map<
          [STBatchArrayMapOut1, STBatchArrayMapOut2]
        >((batch) => [{ applied: batch.applied }, batch.stateTransitions]);
        return {
          ...txMapped,
          stateTransitions: this.stateTransitionBatchMapper.mapIn(stBatch),
        };
      }
    );

    if (log.getLevel() === log.levels.DEBUG) {
      Provable.log("Parsed data from the indexer", {
        block,
        result,
        transactions,
      });
    }

    return {
      block: {
        ...block,
        transactions,
      },
      result: {
        ...result,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async start() {}
}
