import assert from "node:assert";

import { container, inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  ProvableNetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableTransactionHook,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  RuntimeProvableMethodExecutionResult,
  StateServiceProvider,
  MandatoryProtocolModulesRecord,
  reduceStateTransitions,
  StateTransition,
  BeforeTransactionHookArguments,
  AfterTransactionHookArguments,
  BlockProverState,
  MethodPublicOutput,
  toBeforeTransactionHookArgument,
  toAfterTransactionHookArgument,
  ProvableStateTransition,
  DefaultProvableHashList,
  addTransactionToBundle,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { AreProofsEnabled, log, mapSequential } from "@proto-kit/common";
import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
  toEventsHash,
} from "@proto-kit/module";
// eslint-disable-next-line import/no-extraneous-dependencies
import zip from "lodash/zip";

import {
  PendingTransaction,
} from "../../../mempool/PendingTransaction";
import { CachedStateService } from "../../../state/state/CachedStateService";
import {
  StateTransitionBatch,
  TransactionExecutionResult,
} from "../../../storage/model/Block";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { trace } from "../../../logging/trace";
import { Tracer } from "../../../logging/Tracer";

const errors = {
  methodIdNotFound: (methodId: string) =>
    new Error(`Can't find runtime method with id ${methodId}`),
};

export type SomeRuntimeMethod = (...args: unknown[]) => Promise<unknown>;

export type RuntimeContextReducedExecutionResult = Pick<
  RuntimeProvableMethodExecutionResult,
  "stateTransitions" | "status" | "statusMessage" | "stackTrace" | "events"
>;

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

async function decodeTransaction(
  tx: PendingTransaction,
  runtime: Runtime<RuntimeModulesRecord>
): Promise<{
  method: SomeRuntimeMethod;
  args: unknown[];
  module: RuntimeModule<unknown>;
}> {
  const methodDescriptors = runtime.methodIdResolver.getMethodNameFromId(
    tx.methodId
  );

  const method = runtime.getMethodById(tx.methodId);

  if (methodDescriptors === undefined || method === undefined) {
    throw errors.methodIdNotFound(tx.methodId);
  }

  const [moduleName, methodName] = methodDescriptors;
  const module: RuntimeModule<unknown> = runtime.resolve(moduleName);

  const parameterDecoder = MethodParameterEncoder.fromMethod(
    module,
    methodName
  );
  const args = await parameterDecoder.decode(
    tx.argsFields.map(Field),
    tx.auxiliaryData
  );

  return {
    method,
    args,
    module,
  };
}

function extractEvents(
  runtimeResult: RuntimeContextReducedExecutionResult,
  source: "afterTxHook" | "beforeTxHook" | "runtime"
): {
  eventName: string;
  data: Field[];
  source: "afterTxHook" | "beforeTxHook" | "runtime";
}[] {
  return runtimeResult.events.reduce(
    (acc, event) => {
      if (event.condition.toBoolean()) {
        const obj = {
          eventName: event.eventName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          data: event.eventType.toFields(event.event),
          source: source,
        };
        acc.push(obj);
      }
      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    [] as {
      eventName: string;
      data: Field[];
      source: "afterTxHook" | "beforeTxHook" | "runtime";
    }[]
  );
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

export async function executeWithExecutionContext<MethodResult>(
  method: () => Promise<MethodResult>,
  contextInputs: RuntimeMethodExecutionData,
  runSimulated = false
): Promise<
  RuntimeContextReducedExecutionResult & { methodResult: MethodResult }
> {
  // Set up context
  const executionContext = container.resolve(RuntimeMethodExecutionContext);

  executionContext.clear();
  executionContext.setup(contextInputs);
  executionContext.setSimulated(runSimulated);

  // Execute method
  const methodResult = await method();

  const { stateTransitions, status, statusMessage, events } =
    executionContext.current().result;

  const reducedSTs = reduceStateTransitions(stateTransitions);

  return {
    stateTransitions: reducedSTs,
    status,
    statusMessage,
    events,
    methodResult,
  };
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

export type TransactionExecutionResultStatus =
  | {
      result: TransactionExecutionResult;
      status: "included";
    }
  | { tx: PendingTransaction; status: "skipped" }
  | { tx: PendingTransaction; status: "shouldRemove" };

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionExecutionService {
  private readonly transactionHooks: ProvableTransactionHook<unknown>[];

  private readonly txHooks: ProvableTransactionHook[];

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

    this.txHooks =
      protocol.dependencyContainer.resolveAll<ProvableTransactionHook>(
        "ProvableTransactionHook"
      );
  }

  private async executeRuntimeMethod(
    method: SomeRuntimeMethod,
    args: unknown[],
    contextInputs: RuntimeMethodExecutionData
  ) {
    return await executeWithExecutionContext(async () => {
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
    const result = await executeWithExecutionContext(
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

    traceLogSTs(`${hookName} STs:`, result.stateTransitions);

    return result;
  }

  private buildSTBatches(
    transitions: StateTransition<unknown>[][],
    {
      runtime: runtimeStatus,
      hooks: hooksStatus,
    }: { runtime: boolean; hooks: boolean }
  ): StateTransitionBatch[] {
    // TODO Why is the last one false by default?
    const statuses = [hooksStatus, runtimeStatus && hooksStatus, false];
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
    const signedTransaction =
      tx.toProtocolTransaction();
    // Add tx to commitments
    return addTransactionToBundle(
      state,
      Bool(tx.isMessage),
      signedTransaction.transaction
    );
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public async createExecutionTraces(
    asyncStateService: CachedStateService,
    transactions: PendingTransaction[],
    networkState: ProvableNetworkState,
    state: BlockTrackers
  ): Promise<{
    blockState: BlockTrackers;
    executionResults: TransactionExecutionResultStatus[];
  }> {
    let blockState = state;
    const executionResults: TransactionExecutionResultStatus[] = [];

    const networkStateHash = networkState.hash();

    for (const tx of transactions) {
      try {
        const newState = this.addTransactionToBlockProverState(blockState, tx);

        // Create execution trace
        const { result: executionTrace, shouldRemove } =
          // eslint-disable-next-line no-await-in-loop
          await this.createExecutionTrace(
            asyncStateService,
            tx,
            { networkState, hash: networkStateHash },
            blockState,
            newState
          );

        // If the hooks fail AND the tx is not a message (in which case we
        // have to still execute it), we skip this tx and don't add it to the block
        if (!executionTrace.hooksStatus && !executionTrace.tx.isMessage) {
          const actionMessage = shouldRemove
            ? "removing as to removeWhen hooks"
            : "skipping";
          log.error(
            `Error in inclusion of tx, ${actionMessage}: Protocol hooks not executable: ${executionTrace.statusMessage ?? "unknown reason"}`
          );
          executionResults.push({
            tx,
            status: shouldRemove ? "shouldRemove" : "skipped",
          });
        } else {
          blockState = newState;

          // Push result to results and transaction onto bundle-hash
          executionResults.push({ result: executionTrace, status: "included" });
        }
      } catch (error) {
        if (error instanceof Error) {
          log.error("Error in inclusion of tx, dropping", error);
          executionResults.push({ tx, status: "shouldRemove" });
        }
      }
    }

    return { blockState, executionResults };
  }

  private async shouldRemove(
    state: CachedStateService,
    args: BeforeTransactionHookArguments
  ) {
    this.stateServiceProvider.setCurrentStateService(state);

    const returnValues = await mapSequential(this.transactionHooks, (hook) =>
      hook.removeTransactionWhen(args)
    );

    this.stateServiceProvider.popCurrentStateService();
    return returnValues.some((x) => x);
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
    }: { networkState: ProvableNetworkState; hash: Field },
    state: BlockTrackers,
    newState: BlockTrackers
  ): Promise<{
    result: TransactionExecutionResult;
    shouldRemove: boolean;
  }> {
    // TODO Use RecordingStateService -> async asProver needed
    const recordingStateService = new CachedStateService(asyncStateService);

    const { method, args, module } = await decodeTransaction(tx, this.runtime);

    // Disable proof generation for sequencing the runtime
    // TODO Is that even needed?
    const appChain = getAreProofsEnabledFromModule(module);
    const previousProofsEnabled = appChain.areProofsEnabled;
    appChain.setProofsEnabled(false);

    const signedTransaction =
      tx.toProtocolTransaction();
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
    const beforeHookEvents = extractEvents(beforeTxHookResult, "beforeTxHook");

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
        transactionHash: Field(tx.hash),
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
    const afterHookEvents = extractEvents(afterTxHookResult, "afterTxHook");
    await recordingStateService.applyStateTransitions(
      afterTxHookResult.stateTransitions
    );

    const txHooksValid =
      beforeTxHookResult.status.toBoolean() &&
      afterTxHookResult.status.toBoolean();
    let shouldRemove = false;
    if (txHooksValid) {
      await recordingStateService.mergeIntoParent();
    } else {
      // Execute removeWhen to determine whether it should be dropped
      shouldRemove = await this.shouldRemove(
        asyncStateService,
        beforeTxArguments
      );
    }

    // Reset global stateservice
    this.stateServiceProvider.popCurrentStateService();

    // Reset proofs enabled
    appChain.setProofsEnabled(previousProofsEnabled);

    // Extract sequencing results
    const runtimeResultEvents = extractEvents(runtimeResult, "runtime");
    const stateTransitions = this.buildSTBatches(
      [
        beforeTxHookResult.stateTransitions,
        runtimeResult.stateTransitions,
        afterTxHookResult.stateTransitions,
      ],
      { runtime: runtimeResult.status.toBoolean(), hooks: txHooksValid }
    );

    return {
      result: {
        tx,
        hooksStatus: txHooksValid,
        status: runtimeResult.status.toBoolean(),
        statusMessage:
          beforeTxHookResult.statusMessage ??
          afterTxHookResult.statusMessage ??
          runtimeResult.statusMessage,

        stateTransitions: stateTransitions,
        events: beforeHookEvents
          .concat(runtimeResultEvents, afterHookEvents)
          .map((e) => ({
            eventName: e.eventName,
            data: e.data.map((f) => f.toString()),
            source: e.source,
          })),
      },
      shouldRemove,
    };
  }
}
