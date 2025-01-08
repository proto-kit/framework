import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  DefaultProvableHashList,
  MandatoryProtocolModulesRecord,
  MinaActions,
  MinaActionsHashList,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableBlockHook,
} from "@proto-kit/protocol";
import { Field } from "o1js";
import { log } from "@proto-kit/common";

import {
  Block,
  BlockWithResult,
  TransactionExecutionResult,
} from "../../../storage/model/Block";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { PendingTransaction } from "../../../mempool/PendingTransaction";

import { TransactionExecutionService } from "./TransactionExecutionService";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockProductionService {
  private readonly blockHooks: ProvableBlockHook<unknown>[];

  public constructor(
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>,
    private readonly transactionExecutionService: TransactionExecutionService
  ) {
    this.blockHooks =
      protocol.dependencyContainer.resolveAll("ProvableBlockHook");
  }

  /**
   * Main entry point for creating a unproven block with everything
   * attached that is needed for tracing
   */
  public async createBlock(
    stateService: CachedStateService,
    transactions: PendingTransaction[],
    lastBlockWithResult: BlockWithResult,
    allowEmptyBlocks: boolean
  ): Promise<Block | undefined> {
    const lastResult = lastBlockWithResult.result;
    const lastBlock = lastBlockWithResult.block;
    const executionResults: TransactionExecutionResult[] = [];

    const transactionsHashList = new DefaultProvableHashList(Field);
    const eternalTransactionsHashList = new DefaultProvableHashList(
      Field,
      Field(lastBlock.toEternalTransactionsHash)
    );

    const incomingMessagesList = new MinaActionsHashList(
      Field(lastBlock.toMessagesHash)
    );

    // Get used networkState by executing beforeBlock() hooks
    const networkState = await this.blockHooks.reduce<Promise<NetworkState>>(
      async (reduceNetworkState, hook) =>
        await hook.beforeBlock(await reduceNetworkState, {
          blockHashRoot: Field(lastResult.blockHashRoot),
          eternalTransactionsHash: lastBlock.toEternalTransactionsHash,
          stateRoot: Field(lastResult.stateRoot),
          transactionsHash: Field(0),
          networkStateHash: lastResult.afterNetworkState.hash(),
          incomingMessagesHash: lastBlock.toMessagesHash,
        }),
      Promise.resolve(lastResult.afterNetworkState)
    );

    for (const tx of transactions) {
      try {
        // Create execution trace
        const executionTrace =
          // eslint-disable-next-line no-await-in-loop
          await this.transactionExecutionService.createExecutionTrace(
            stateService,
            tx,
            networkState
          );

        // Push result to results and transaction onto bundle-hash
        executionResults.push(executionTrace);
        if (!tx.isMessage) {
          transactionsHashList.push(tx.hash());
          eternalTransactionsHashList.push(tx.hash());
        } else {
          const actionHash = MinaActions.actionHash(
            tx.toRuntimeTransaction().hashData()
          );

          incomingMessagesList.push(actionHash);
        }
      } catch (error) {
        if (error instanceof Error) {
          log.error("Error in inclusion of tx, skipping", error);
        }
      }
    }

    const previousBlockHash =
      lastResult.blockHash === 0n ? undefined : Field(lastResult.blockHash);

    if (executionResults.length === 0 && !allowEmptyBlocks) {
      log.info(
        "After sequencing, block has no sequencable transactions left, skipping block"
      );
      return undefined;
    }

    const block: Omit<Block, "hash"> = {
      transactions: executionResults,
      transactionsHash: transactionsHashList.commitment,
      fromEternalTransactionsHash: lastBlock.toEternalTransactionsHash,
      toEternalTransactionsHash: eternalTransactionsHashList.commitment,
      height:
        lastBlock.hash.toBigInt() !== 0n ? lastBlock.height.add(1) : Field(0),
      fromBlockHashRoot: Field(lastResult.blockHashRoot),
      fromMessagesHash: lastBlock.toMessagesHash,
      toMessagesHash: incomingMessagesList.commitment,
      previousBlockHash,

      networkState: {
        before: new NetworkState(lastResult.afterNetworkState),
        during: networkState,
      },
    };

    const hash = Block.hash(block);

    return {
      ...block,
      hash,
    };
  }
}
