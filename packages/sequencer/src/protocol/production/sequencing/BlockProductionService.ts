import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BeforeBlockHookArguments,
  MandatoryProtocolModulesRecord,
  MinaActionsHashList,
  ProvableNetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableBlockHook,
  reduceStateTransitions,
  RuntimeTransaction,
  StateServiceProvider,
  toBeforeBlockHookArgument,
  TransactionHashList,
} from "@proto-kit/protocol";
import { Field } from "o1js";
import { log, FieldString } from "@proto-kit/common";
import { match } from "ts-pattern";

import {
  Block,
  BlockWithResult,
  TransactionExecutionResult,
} from "../../../storage/model/Block";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { AsyncStateService } from "../../../state/async/AsyncStateService";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { Tracer } from "../../../logging/Tracer";
import { trace } from "../../../logging/trace";

import {
  BlockTrackers,
  executeWithExecutionContext,
  TransactionExecutionResultStatus,
  TransactionExecutionService,
} from "./TransactionExecutionService";

function isIncludedTxs(
  x: TransactionExecutionResultStatus
): x is { status: "included"; result: TransactionExecutionResult } {
  return x.status === "included";
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockProductionService {
  private readonly blockHooks: ProvableBlockHook<unknown>[];

  public constructor(
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>,
    @inject("Tracer")
    public readonly tracer: Tracer,
    private readonly transactionExecutionService: TransactionExecutionService,
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider
  ) {
    this.blockHooks =
      protocol.dependencyContainer.resolveAll("ProvableBlockHook");
  }

  @trace("block.hook.before")
  public async executeBeforeBlockHook(
    args: BeforeBlockHookArguments,
    inputNetworkState: ProvableNetworkState,
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
        await this.blockHooks.reduce<Promise<ProvableNetworkState>>(
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
        includedTxs: {
          hash: string;
          type: "included" | "skipped" | "shouldRemove";
        }[];
      }
    | undefined
  > {
    const stateService = new CachedStateService(asyncStateService);

    const lastResult = lastBlockWithResult.result;
    const lastBlock = lastBlockWithResult.block;

    const blockState: BlockTrackers = {
      blockHashRoot: Field(lastResult.blockHashRoot),
      eternalTransactionsList: new TransactionHashList(
        Field(lastBlock.toEternalTransactionsHash)
      ),
      transactionList: new TransactionHashList(),
      incomingMessages: new MinaActionsHashList(
        Field(lastBlock.toMessagesHash)
      ),
    };

    // Get used networkState by executing beforeBlock() hooks
    const beforeHookResult = await this.executeBeforeBlockHook(
      toBeforeBlockHookArgument(blockState),
      new ProvableNetworkState(
        ProvableNetworkState.fromJSON(lastResult.afterNetworkState)
      ),
      stateService
    );

    const networkState = beforeHookResult.methodResult;
    const beforeBlockStateTransitions = reduceStateTransitions(
      beforeHookResult.stateTransitions
    ).map((transition) =>
      UntypedStateTransition.fromStateTransition(transition)
    );

    const { blockState: newBlockState, executionResults } =
      await this.transactionExecutionService.createExecutionTraces(
        stateService,
        transactions,
        networkState,
        blockState
      );

    const previousBlockHash =
      lastResult.blockHash === "0"
        ? undefined
        : FieldString(lastResult.blockHash);

    if (executionResults.length === 0 && !allowEmptyBlocks) {
      log.info(
        "After sequencing, block has no sequenceable transactions left, skipping block"
      );
      return undefined;
    }

    const includedTransactions = executionResults
      .filter(isIncludedTxs)
      .map((x) => x.result);

    const block: Omit<Block, "hash"> = {
      transactions: includedTransactions,
      transactionsHash: FieldString(newBlockState.transactionList.commitment),
      fromEternalTransactionsHash: lastBlock.toEternalTransactionsHash,
      toEternalTransactionsHash: FieldString(
        newBlockState.eternalTransactionsList.commitment
      ),
      height: lastBlock.hash !== "0" ? lastBlock.height + 1 : 0,
      fromBlockHashRoot: FieldString(lastResult.blockHashRoot),
      fromMessagesHash: lastBlock.toMessagesHash,
      fromStateRoot: FieldString(lastResult.stateRoot),
      toMessagesHash: FieldString(newBlockState.incomingMessages.commitment),
      previousBlockHash,

      networkState: {
        before: lastResult.afterNetworkState,
        during: ProvableNetworkState.toJSON(networkState),
      },
      beforeBlockStateTransitions: beforeBlockStateTransitions,
    };

    const hash = Block.hash(block).toString();

    const includedTxs = executionResults.map((x) => {
      const txHash = match(x)
        .with({ status: "included" }, ({ result }) => result.tx)
        .otherwise(({ tx }) => tx).hash;

      return {
        hash: txHash,
        type: x.status,
      };
    });

    return {
      block: {
        ...block,
        hash,
      },
      stateChanges: stateService,
      includedTxs,
    };
  }
}
