import assert from "node:assert";

import { container, inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableTransactionHook,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  StateServiceProvider,
  MandatoryProtocolModulesRecord,
  reduceStateTransitions,
  StateTransition,
  BlockProver,
  BlockProverProgrammable,
  BeforeTransactionHookArguments,
  AfterTransactionHookArguments,
  BlockProverState,
  MethodPublicOutput,
  toBeforeTransactionHookArgument,
  toAfterTransactionHookArgument,
  ProvableStateTransition,
  DefaultProvableHashList,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { AreProofsEnabled, log, mapSequential } from "@proto-kit/common";
import {
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
  toEventsHash,
} from "@proto-kit/module";
// eslint-disable-next-line import/no-extraneous-dependencies
import zip from "lodash/zip";

import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { CachedStateService } from "../../../state/state/CachedStateService";
import {
  StateTransitionBatch,
  TransactionExecutionResult,
} from "../../../storage/model/Block";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { trace } from "../../../logging/trace";
import { Tracer } from "../../../logging/Tracer";
import { distinct } from "../../../helpers/utils";
import { TransactionUtils } from "../utils/transaction-utils";

import { PreprocessedTransaction } from "./preprocessing/TransactionPreprocessor";

import SomeRuntimeMethod = TransactionUtils.SomeRuntimeMethod;

export type BlockTrackers = Pick<
  BlockProverState,
  | "transactionList"
  | "eternalTransactionsList"
  | "incomingMessages"
  | "blockHashRoot"
>;

function getAreProofsEnabledFromModule(
  module: RuntimeModule<unknown>
): AreProofsEnabled {
  if (module.parent === undefined) {
    throw new Error("Runtime on RuntimeModule not set");
  }
  if (module.parent.areProofsEnabled === undefined) {
    throw new Error("AppChain on Runtime not set");
  }
  const { areProofsEnabled } = module.parent;
  return areProofsEnabled;
}

// TODO Also use this in tracing as a replacement of toStateTransitionHash
export function toStateTransitionHashNonProvable(
  stateTransitions: StateTransition<unknown>[]
) {
  const reduced = reduceStateTransitions(stateTransitions);
  const list = new DefaultProvableHashList(ProvableStateTransition);

  reduced.map((st) => st.toProvable()).forEach((st) => list.push(st));

  return list.commitment;
}

function traceLogSTs(msg: string, stateTransitions: StateTransition<any>[]) {
  log.trace(
    msg,
    JSON.stringify(
      stateTransitions.map((x) => x.toJSON()),
      null,
      2
    )
  );
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionExecutionService {
  private readonly transactionHooks: ProvableTransactionHook<unknown>[];

  private readonly blockProver: BlockProverProgrammable;

  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>,
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>,
    // Coming in from the appchain scope (accessible by protocol & runtime)
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider,
    @inject("Tracer")
    public readonly tracer: Tracer
  ) {
    this.transactionHooks = protocol.dependencyContainer.resolveAll(
      "ProvableTransactionHook"
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.blockProver = (protocol.blockProver as BlockProver).zkProgrammable;
  }

  private async executeRuntimeMethod(
    method: SomeRuntimeMethod,
    args: unknown[],
    contextInputs: RuntimeMethodExecutionData
  ) {
    return await TransactionUtils.executeWithExecutionContext(async () => {
      await method(...args);
    }, contextInputs);
  }

  private async wrapHooksForContext(method: () => Promise<void>) {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);

    executionContext.beforeMethod("protocol", "hook", []);

    await method();

    executionContext.afterMethod();
  }

  private async executeProtocolHooks<
    T extends BeforeTransactionHookArguments | AfterTransactionHookArguments,
  >(
    hookArguments: T,
    method: (
      module: ProvableTransactionHook<unknown>,
      args: T
    ) => Promise<void>,
    hookName: string,
    runSimulated = false
  ) {
    const result = await TransactionUtils.executeWithExecutionContext(
      async () =>
        await this.wrapHooksForContext(async () => {
          await mapSequential(
            this.transactionHooks,
            async (transactionHook) => {
              await method(transactionHook, hookArguments);
            }
          );
        }),
      {
        transaction: hookArguments.transaction,
        networkState: hookArguments.networkState,
      },
      runSimulated
    );

    if (!result.status.toBoolean()) {
      const error = new Error(
        `Protocol hooks not executable: ${result.statusMessage ?? "unknown"}`
      );
      log.debug("Protocol hook error stack trace:", result.stackTrace);
      // Propagate stack trace from the assertion
      throw error;
    }

    traceLogSTs(`${hookName} STs:`, result.stateTransitions);

    return result;
  }

  private buildSTBatches(
    transitions: StateTransition<unknown>[][],
    runtimeStatus: Bool
  ): StateTransitionBatch[] {
    const statuses = [true, runtimeStatus.toBoolean(), false];
    const reducedTransitions = transitions.map((batch) =>
      reduceStateTransitions(batch).map((transition) =>
        UntypedStateTransition.fromStateTransition(transition)
      )
    );

    assert.equal(reducedTransitions.length, 3);

    return zip(reducedTransitions, statuses).map(
      ([stateTransitions, applied]) => ({
        stateTransitions: stateTransitions!,
        applied: applied!,
      })
    );
  }

  public addTransactionToBlockProverState(
    state: BlockTrackers,
    tx: PendingTransaction
  ): BlockTrackers {
    const signedTransaction = tx.toProtocolTransaction();
    // Add tx to commitments
    return this.blockProver.addTransactionToBundle(
      state,
      Bool(tx.isMessage),
      signedTransaction.transaction
    );
  }

  @trace("block.preprocess.preload-state")
  public async preloadKnownStatePaths(
    transactions: PreprocessedTransaction[],
    asyncStateService: CachedStateService
  ) {
    const paths = transactions
      .flatMap(({ accessedStatePaths }) => accessedStatePaths)
      .filter(distinct);

    await asyncStateService.preloadKeys(paths.map(Field));
  }

  public async createExecutionTraces(
    asyncStateService: CachedStateService,
    transactions: PreprocessedTransaction[],
    networkState: NetworkState,
    state: BlockTrackers
  ): Promise<[BlockTrackers, TransactionExecutionResult[]]> {
    await this.preloadKnownStatePaths(transactions, asyncStateService);

    let blockState = state;
    const executionResults: TransactionExecutionResult[] = [];

    const networkStateHash = networkState.hash();

    for (const { tx } of transactions) {
      try {
        const newState = this.addTransactionToBlockProverState(state, tx);

        // Create execution trace
        const executionTrace =
          // eslint-disable-next-line no-await-in-loop
          await this.createExecutionTrace(
            asyncStateService,
            tx,
            { networkState, hash: networkStateHash },
            blockState,
            newState
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

    return [blockState, executionResults];
  }

  @trace("block.transaction", ([, tx, { networkState }]) => ({
    height: networkState.block.height.toString(),
    methodId: tx.methodId.toString(),
    isMessage: tx.isMessage,
  }))
  public async createExecutionTrace(
    asyncStateService: CachedStateService,
    tx: PendingTransaction,
    {
      networkState,
      hash: networkStateHash,
    }: { networkState: NetworkState; hash: Field },
    state: BlockTrackers,
    newState: BlockTrackers
  ): Promise<TransactionExecutionResult> {
    // TODO Use RecordingStateService -> async asProver needed
    const recordingStateService = new CachedStateService(asyncStateService);

    const { method, args, module } = await TransactionUtils.decodeTransaction(
      tx,
      this.runtime
    );

    // Disable proof generation for sequencing the runtime
    // TODO Is that even needed?
    const appChain = getAreProofsEnabledFromModule(module);
    const previousProofsEnabled = appChain.areProofsEnabled;
    appChain.setProofsEnabled(false);

    const signedTransaction = tx.toProtocolTransaction();
    const runtimeContextInputs = {
      transaction: signedTransaction.transaction,
      networkState,
    };

    // The following steps generate and apply the correct STs with the right values
    this.stateServiceProvider.setCurrentStateService(recordingStateService);

    // Execute beforeTransaction hooks
    const beforeTxArguments = toBeforeTransactionHookArgument(
      signedTransaction,
      networkState,
      state
    );
    const beforeTxHookResult = await this.tracer.trace(
      "block.transaction.before.execute",
      () =>
        this.executeProtocolHooks(
          beforeTxArguments,
          async (hook, hookArgs) => {
            await hook.beforeTransaction(hookArgs);
          },
          "beforeTx"
        )
    );
    const beforeHookEvents = TransactionUtils.extractEvents(
      beforeTxHookResult,
      "beforeTxHook"
    );

    await recordingStateService.applyStateTransitions(
      beforeTxHookResult.stateTransitions
    );

    const runtimeResult = await this.tracer.trace(
      "block.transaction.execute",
      () => this.executeRuntimeMethod(method, args, runtimeContextInputs)
    );
    traceLogSTs("STs:", runtimeResult.stateTransitions);

    // Apply runtime STs (only if the tx succeeded)
    if (runtimeResult.status.toBoolean()) {
      // Apply protocol STs
      await recordingStateService.applyStateTransitions(
        runtimeResult.stateTransitions
      );
    }

    const eventsHash = toEventsHash(runtimeResult.events);
    const stateTransitionsHash = toStateTransitionHashNonProvable(
      runtimeResult.stateTransitions
    );

    // Execute afterTransaction hook
    const afterTxArguments = toAfterTransactionHookArgument(
      signedTransaction,
      networkState,
      newState,
      new MethodPublicOutput({
        status: runtimeResult.status,
        networkStateHash: networkStateHash,
        isMessage: Bool(tx.isMessage),
        transactionHash: tx.hash(),
        eventsHash,
        stateTransitionsHash,
      })
    );

    const afterTxHookResult = await this.tracer.trace(
      "block.transaction.after.execute",
      () =>
        this.executeProtocolHooks(
          afterTxArguments,
          async (hook, hookArgs) => await hook.afterTransaction(hookArgs),
          "afterTx"
        )
    );
    const afterHookEvents = TransactionUtils.extractEvents(
      afterTxHookResult,
      "afterTxHook"
    );
    await recordingStateService.applyStateTransitions(
      afterTxHookResult.stateTransitions
    );

    await recordingStateService.mergeIntoParent();

    // Reset global stateservice
    this.stateServiceProvider.popCurrentStateService();

    // Reset proofs enabled
    appChain.setProofsEnabled(previousProofsEnabled);

    // Extract sequencing results
    const runtimeResultEvents = TransactionUtils.extractEvents(
      runtimeResult,
      "runtime"
    );
    const stateTransitions = this.buildSTBatches(
      [
        beforeTxHookResult.stateTransitions,
        runtimeResult.stateTransitions,
        afterTxHookResult.stateTransitions,
      ],
      runtimeResult.status
    );

    return {
      tx,
      status: runtimeResult.status,
      statusMessage: runtimeResult.statusMessage,

      stateTransitions,
      events: beforeHookEvents.concat(runtimeResultEvents, afterHookEvents),
    };
  }
}
