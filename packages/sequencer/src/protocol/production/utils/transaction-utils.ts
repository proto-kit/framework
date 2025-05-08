import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  reduceStateTransitions,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  RuntimeProvableMethodExecutionResult,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { Field } from "o1js";

import { PendingTransaction } from "../../../mempool/PendingTransaction";

export namespace TransactionUtils {
  const errors = {
    methodIdNotFound: (methodId: string) =>
      new Error(`Can't find runtime method with id ${methodId}`),
  };

  export type SomeRuntimeMethod = (...args: unknown[]) => Promise<unknown>;

  export type RuntimeContextReducedExecutionResult = Pick<
    RuntimeProvableMethodExecutionResult,
    "stateTransitions" | "status" | "statusMessage" | "stackTrace" | "events"
  >;

  export async function decodeTransaction(
    tx: PendingTransaction,
    runtime: Runtime<RuntimeModulesRecord>
  ): Promise<{
    method: SomeRuntimeMethod;
    args: unknown[];
    module: RuntimeModule<unknown>;
    combinedMethodName: string;
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
      combinedMethodName: `${moduleName}.${methodName}`,
    };
  }

  export function extractEvents(
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
}
