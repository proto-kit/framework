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
  BlockProver,
  BlockProverProgrammable,
  BeforeTransactionHookArguments,
  AfterTransactionHookArguments,
  BlockProverState,
  MethodPublicOutput,
  toBeforeTransactionHookArgument,
  toAfterTransactionHookArgument,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { AreProofsEnabled, log, mapSequential } from "@proto-kit/common";
import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
  toEventsHash,
  toStateTransitionsHash,
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

function traceSTs(msg: string, stateTransitions: StateTransition<any>[]) {
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
    private readonly stateServiceProvider: StateServiceProvider
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

    if (!result.status.toBoolean()) {
      const error = new Error(
        `Protocol hooks not executable: ${result.statusMessage ?? "unknown"}`
      );
      log.debug("Protocol hook error stack trace:", result.stackTrace);
      // Propagate stack trace from the assertion
      throw error;
    }

    traceSTs(`${hookName} STs:`, result.stateTransitions);

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

  public async createExecutionTrace(
    asyncStateService: CachedStateService,
    tx: PendingTransaction,
    networkState: NetworkState,
    state: BlockTrackers
  ): Promise<[BlockTrackers, TransactionExecutionResult]> {
    // TODO Use RecordingStateService -> async asProver needed
    const recordingStateService = new CachedStateService(asyncStateService);

    const { method, args, module } = await decodeTransaction(tx, this.runtime);

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
    const beforeTxHookResult = await this.executeProtocolHooks(
      beforeTxArguments,
      async (hook, hookArgs) => await hook.beforeTransaction(hookArgs),
      "beforeTx"
    );
    const beforeHookEvents = extractEvents(beforeTxHookResult, "beforeTxHook");

    await recordingStateService.applyStateTransitions(
      beforeTxHookResult.stateTransitions
    );

    const runtimeResult = await this.executeRuntimeMethod(
      method,
      args,
      runtimeContextInputs
    );
    traceSTs("STs:", runtimeResult.stateTransitions);

    // Apply runtime STs (only if the tx succeeded)
    if (runtimeResult.status.toBoolean()) {
      // Apply protocol STs
      await recordingStateService.applyStateTransitions(
        runtimeResult.stateTransitions
      );
    }

    // Add runtime to commitments
    const newState = this.blockProver.addTransactionToBundle(
      state,
      Bool(tx.isMessage),
      signedTransaction.transaction
    );

    // Execute afterTransaction hook
    const afterTxArguments = toAfterTransactionHookArgument(
      signedTransaction,
      networkState,
      newState,
      new MethodPublicOutput({
        status: runtimeResult.status,
        networkStateHash: networkState.hash(),
        isMessage: Bool(tx.isMessage),
        transactionHash: tx.hash(),
        eventsHash: toEventsHash(runtimeResult.events),
        stateTransitionsHash: toStateTransitionsHash(
          runtimeResult.stateTransitions
        ),
      })
    );

    const afterTxHookResult = await this.executeProtocolHooks(
      afterTxArguments,
      async (hook, hookArgs) => await hook.afterTransaction(hookArgs),
      "afterTx"
    );
    const afterHookEvents = extractEvents(afterTxHookResult, "afterTxHook");
    await recordingStateService.applyStateTransitions(
      afterTxHookResult.stateTransitions
    );

    await recordingStateService.mergeIntoParent();

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
      runtimeResult.status
    );

    return [
      state,
      {
        tx,
        status: runtimeResult.status,
        statusMessage: runtimeResult.statusMessage,

        stateTransitions,
        events: beforeHookEvents.concat(afterHookEvents, runtimeResultEvents),
      },
    ];
  }
}
