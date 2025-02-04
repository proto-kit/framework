import { container, inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProverExecutionData,
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
} from "@proto-kit/protocol";
import { Field } from "o1js";
import { AreProofsEnabled, log, mapSequential } from "@proto-kit/common";
import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";

import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { TransactionExecutionResult } from "../../../storage/model/Block";
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

function getAreProofsEnabledFromModule(
  module: RuntimeModule<unknown>
): AreProofsEnabled {
  if (module.runtime === undefined) {
    throw new Error("Runtime on RuntimeModule not set");
  }
  if (module.runtime.areProofsEnabled === undefined) {
    throw new Error("AppChain on Runtime not set");
  }
  const { areProofsEnabled } = module.runtime;
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
  runtimeResult: RuntimeContextReducedExecutionResult
): { eventName: string; data: Field[] }[] {
  return runtimeResult.events.reduce(
    (acc, event) => {
      if (event.condition.toBoolean()) {
        const obj = {
          eventName: event.eventName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          data: event.eventType.toFields(event.event),
        };
        acc.push(obj);
      }
      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    [] as { eventName: string; data: Field[] }[]
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

  private async executeProtocolHooks(
    runtimeContextInputs: RuntimeMethodExecutionData,
    blockContextInputs: BlockProverExecutionData,
    runSimulated = false
  ) {
    return await executeWithExecutionContext(
      async () =>
        await this.wrapHooksForContext(async () => {
          await mapSequential(
            this.transactionHooks,
            async (transactionHook) => {
              await transactionHook.onTransaction(blockContextInputs);
            }
          );
        }),
      runtimeContextInputs,
      runSimulated
    );
  }

  public async createExecutionTrace(
    asyncStateService: CachedStateService,
    tx: PendingTransaction,
    networkState: NetworkState
  ): Promise<TransactionExecutionResult> {
    // TODO Use RecordingStateService -> async asProver needed
    const recordingStateService = new CachedStateService(asyncStateService);

    const { method, args, module } = await decodeTransaction(tx, this.runtime);

    // Disable proof generation for tracing
    const appChain = getAreProofsEnabledFromModule(module);
    const previousProofsEnabled = appChain.areProofsEnabled;
    appChain.setProofsEnabled(false);

    const signedTransaction = tx.toProtocolTransaction();
    const blockContextInputs: BlockProverExecutionData = {
      networkState,
      transaction: signedTransaction.transaction,
      signature: signedTransaction.signature,
    };
    const runtimeContextInputs = {
      transaction: blockContextInputs.transaction,
      networkState: blockContextInputs.networkState,
    };

    // The following steps generate and apply the correct STs with the right values
    this.stateServiceProvider.setCurrentStateService(recordingStateService);

    const protocolResult = await this.executeProtocolHooks(
      runtimeContextInputs,
      blockContextInputs
    );

    if (!protocolResult.status.toBoolean()) {
      const error = new Error(
        `Protocol hooks not executable: ${
          protocolResult.statusMessage ?? "unknown"
        }`
      );
      log.debug("Protocol hook error stack trace:", protocolResult.stackTrace);
      // Propagate stack trace from the assertion
      throw error;
    }

    traceSTs("PSTs:", protocolResult.stateTransitions);

    // Apply protocol STs
    await recordingStateService.applyStateTransitions(
      protocolResult.stateTransitions
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

    await recordingStateService.mergeIntoParent();

    // Reset global stateservice
    this.stateServiceProvider.popCurrentStateService();

    // Reset proofs enabled
    appChain.setProofsEnabled(previousProofsEnabled);

    const events = extractEvents(runtimeResult);

    return {
      tx,
      status: runtimeResult.status,
      statusMessage: runtimeResult.statusMessage,

      stateTransitions: runtimeResult.stateTransitions.map((st) =>
        UntypedStateTransition.fromStateTransition(st)
      ),

      protocolTransitions: protocolResult.stateTransitions.map((st) =>
        UntypedStateTransition.fromStateTransition(st)
      ),

      events,
    };
  }
}
