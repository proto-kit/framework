import { BlockWithResult } from "@proto-kit/sequencer";
import {
  Block as PrismaBlock,
  BlockResult as PrismaBlockResult,
  Transaction as PrismaTransaction,
  TransactionExecutionResult as PrismaTransactionExecutionResult,
} from "@prisma/client";
import {
  BlockMapper,
  BlockResultMapper,
  TransactionExecutionResultMapper,
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
      result: PrismaBlockResult;
    } & {
      transactions: (PrismaTransactionExecutionResult & {
        tx: PrismaTransaction;
      })[];
    };
  };
}

@injectable()
export class BlockFetching extends ProcessorModule<BlockFetchingConfig> {
  public constructor(
    public blockMapper: BlockMapper,
    public blockResultMapper: BlockResultMapper,
    public transactionResultMapper: TransactionExecutionResultMapper
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
            }
            transactions {
              stateTransitions
              protocolTransitions
              status
              statusMessage
              events
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

    const block = this.blockMapper.mapIn(parsedResponse?.data.findFirstBlock);
    const result = this.blockResultMapper.mapIn(
      parsedResponse?.data.findFirstBlock.result
    );
    const transactions = parsedResponse?.data.findFirstBlock.transactions.map(
      (tx) => {
        return this.transactionResultMapper.mapIn([tx, tx.tx]);
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
      result,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async start() {}
}
