import assert from "node:assert";

import { container, inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  NetworkState,
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
  TransactionProverState,
  TransactionHashList,
  MinaActionsHashList,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { mapSequential } from "@proto-kit/common";
import {
  MethodParameterEncoder,
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
  TransactionProverState,
  "eternalTransactionsList" | "incomingMessages" | "transactionList"
> &
  Pick<BlockProverState, "blockHashRoot">;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const BlockTrackers = {
  clone: (trackers: BlockTrackers) => {
    return {
      eternalTransactionsList: new TransactionHashList(
        trackers.eternalTransactionsList.commitment
      ),
      transactionList: new TransactionHashList(
        trackers.transactionList.commitment
      ),
      incomingMessages: new MinaActionsHashList(
        trackers.incomingMessages.commitment
      ),
      blockHashRoot: trackers.blockHashRoot,
    } satisfies BlockTrackers;
  },
};

async function decodeTransaction(
  tx: PendingTransaction,
  runtime: Runtime<RuntimeModulesRecord>
): Promise<{
  method: SomeRuntimeMethod;
  args: unknown[];
  module: RuntimeModule<unknown>;
}> {
  const methodDescriptors = runtime.methodIdResolver.getMethodNameFromId(
    tx.methodId.toBigInt()
  );

  const method = runtime.getMethodById(tx.methodId.toBigInt());

  if (methodDescriptors === undefined || method === undefined) {
    throw errors.methodIdNotFound(tx.methodId.toString());
  }

  const [moduleName, methodName] = methodDescriptors;
  const module: RuntimeModule<unknown> = runtime.resolve(moduleName);

  const parameterDecoder = MethodParameterEncoder.fromMethod(
    module,
    methodName
  );
  const args = await parameterDecoder.decode(tx.argsFields, tx.auxiliaryData);

  return {
    method,
    args,
    module,
  };
}

function extractEvents(
  events: RuntimeContextReducedExecutionResult["events"],
  source: "afterTxHook" | "beforeTxHook" | "runtime"
): {
  eventName: string;
  data: Field[];
  source: "afterTxHook" | "beforeTxHook" | "runtime";
}[] {
  return events.reduce(
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

export type TransactionExecutionResultStatus =
  | {
      result: TransactionExecutionResult;
      // Just for convenience
      tx: PendingTransaction;
      status: "included";
    }
  | { tx: PendingTransaction; status: "skipped" }
  | { tx: PendingTransaction; status: "shouldRemove" };

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionExecutionService {
  private readonly transactionHooks: ProvableTransactionHook<unknown>[];

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
    return await executeWithExecutionContext(
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
        transaction: hookArguments.transaction.transaction,
        networkState: hookArguments.networkState,
      },
      runSimulated
    );
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
    const signedTransaction = tx.toProtocolTransaction();
    // Add tx to commitments
    return addTransactionToBundle(
      state,
      Bool(tx.isMessage),
      signedTransaction.transaction
    );
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
    const signedTransaction = tx.toProtocolTransaction();

    // The following steps generate and apply the correct STs with the right values
    this.stateServiceProvider.setCurrentStateService(asyncStateService);

    // 1. beforeTransaction hooks
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
    const beforeHookEvents = extractEvents(
      beforeTxHookResult.events,
      "beforeTxHook"
    );

    await asyncStateService.applyStateTransitions(
      beforeTxHookResult.stateTransitions
    );

    // 2. Runtime
    const { method, args } = await decodeTransaction(tx, this.runtime);
    const runtimeContextInputs = {
      transaction: signedTransaction.transaction,
      networkState,
    };

    const runtimeResult = await this.tracer.trace(
      "block.transaction.execute",
      () => this.executeRuntimeMethod(method, args, runtimeContextInputs)
    );

    // Apply runtime STs (only if the tx succeeded)
    if (runtimeResult.status.toBoolean()) {
      // Apply protocol STs
      await asyncStateService.applyStateTransitions(
        runtimeResult.stateTransitions
      );
    }

    const eventsHash = toEventsHash(runtimeResult.events);
    const stateTransitionsHash = toStateTransitionHashNonProvable(
      runtimeResult.stateTransitions
    );

    // 3. afterTransaction hook
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
    const afterHookEvents = extractEvents(
      afterTxHookResult.events,
      "afterTxHook"
    );
    await asyncStateService.applyStateTransitions(
      afterTxHookResult.stateTransitions
    );

    const txHooksValid =
      beforeTxHookResult.status.toBoolean() &&
      afterTxHookResult.status.toBoolean();

    // Reset global stateservice
    this.stateServiceProvider.popCurrentStateService();

    // Extract sequencing results
    const runtimeResultEvents = extractEvents(runtimeResult.events, "runtime");
    const stateTransitions = this.buildSTBatches(
      [
        beforeTxHookResult.stateTransitions,
        runtimeResult.stateTransitions,
        afterTxHookResult.stateTransitions,
      ],
      { runtime: runtimeResult.status.toBoolean(), hooks: txHooksValid }
    );

    return {
      tx,
      hooksStatus: Bool(txHooksValid),
      status: runtimeResult.status,
      statusMessage:
        beforeTxHookResult.statusMessage ??
        afterTxHookResult.statusMessage ??
        runtimeResult.statusMessage,

      stateTransitions,
      events: beforeHookEvents.concat(runtimeResultEvents, afterHookEvents),
    };
  }
}
