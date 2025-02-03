import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BeforeBlockHookArguments,
  MandatoryProtocolModulesRecord,
  MinaActionsHashList,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableBlockHook,
  reduceStateTransitions,
  RuntimeTransaction,
  StateServiceProvider,
  toProvableHookBlockState,
  TransactionHashList,
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
import { AsyncStateService } from "../../../state/async/AsyncStateService";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";

import {
  BlockTrackers,
  executeWithExecutionContext,
  TransactionExecutionService,
} from "./TransactionExecutionService";
import { Tracer } from "../../../logging/Tracer";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockProductionService {
  private readonly blockHooks: ProvableBlockHook<unknown>[];

  public constructor(
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>,
    @inject("Tracer")
    private readonly tracer: Tracer,
    private readonly transactionExecutionService: TransactionExecutionService,
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider
  ) {
    this.blockHooks =
      protocol.dependencyContainer.resolveAll("ProvableBlockHook");
  }

  public async executeBeforeBlockHook(
    args: BeforeBlockHookArguments,
    inputNetworkState: NetworkState,
    cachedStateService: CachedStateService
  ) {
    this.stateServiceProvider.setCurrentStateService(cachedStateService);

    // Execute afterBlock hooks
    const context = {
      networkState: inputNetworkState,
      transaction: RuntimeTransaction.dummyTransaction(),
    };

    const executionResult = await executeWithExecutionContext(
      async () =>
        await this.blockHooks.reduce<Promise<NetworkState>>(
          async (networkState, hook) =>
            await hook.beforeBlock(await networkState, args),
          Promise.resolve(inputNetworkState)
        ),
      context
    );

    this.stateServiceProvider.popCurrentStateService();
    await cachedStateService.applyStateTransitions(
      executionResult.stateTransitions
    );

    return executionResult;
  }

  /**
   * Main entry point for creating a unproven block with everything
   * attached that is needed for tracing
   */
  public async createBlock(
    asyncStateService: AsyncStateService,
    transactions: PendingTransaction[],
    lastBlockWithResult: BlockWithResult,
    allowEmptyBlocks: boolean
  ): Promise<
    | {
        block: Block;
        stateChanges: CachedStateService;
      }
    | undefined
  > {
    const stateService = new CachedStateService(asyncStateService);

    const lastResult = lastBlockWithResult.result;
    const lastBlock = lastBlockWithResult.block;
    const executionResults: TransactionExecutionResult[] = [];

    const incomingMessagesList = new MinaActionsHashList(
      Field(lastBlock.toMessagesHash)
    );

    let blockState: BlockTrackers = {
      blockHashRoot: Field(lastResult.blockHashRoot),
      eternalTransactionsList: new TransactionHashList(
        lastBlock.toEternalTransactionsHash
      ),
      transactionList: new TransactionHashList(),
      incomingMessages: new MinaActionsHashList(lastBlock.toMessagesHash),
    };

    // Get used networkState by executing beforeBlock() hooks
    const beforeHookResult = await this.executeBeforeBlockHook(
      toProvableHookBlockState(blockState),
      lastResult.afterNetworkState,
      stateService
    );

    const networkState = beforeHookResult.methodResult;
    const beforeBlockStateTransitions = reduceStateTransitions(
      beforeHookResult.stateTransitions
    ).map((transition) =>
      UntypedStateTransition.fromStateTransition(transition)
    );

    for (const tx of transactions) {
      try {
        // Create execution trace
        const [newState, executionTrace] =
          // eslint-disable-next-line no-await-in-loop
          await this.transactionExecutionService.createExecutionTrace(
            stateService,
            tx,
            networkState,
            blockState
          );

        blockState = newState;

        // Push result to results and transaction onto bundle-hash
        executionResults.push(executionTrace);
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
        "After sequencing, block has no sequenceable transactions left, skipping block"
      );
      return undefined;
    }

    const block: Omit<Block, "hash"> = {
      transactions: executionResults,
      transactionsHash: blockState.transactionList.commitment,
      fromEternalTransactionsHash: lastBlock.toEternalTransactionsHash,
      toEternalTransactionsHash: blockState.eternalTransactionsList.commitment,
      height:
        lastBlock.hash.toBigInt() !== 0n ? lastBlock.height.add(1) : Field(0),
      fromBlockHashRoot: Field(lastResult.blockHashRoot),
      fromMessagesHash: lastBlock.toMessagesHash,
      fromStateRoot: Field(lastResult.stateRoot),
      toMessagesHash: incomingMessagesList.commitment,
      previousBlockHash,

      networkState: {
        before: new NetworkState(lastResult.afterNetworkState),
        during: networkState,
      },
      beforeBlockStateTransitions,
    };

    const hash = Block.hash(block);

    return {
      block: {
        ...block,
        hash,
      },
      stateChanges: stateService,
    };
  }
}
