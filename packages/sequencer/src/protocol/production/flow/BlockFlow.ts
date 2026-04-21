import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  TransactionProof,
} from "@proto-kit/protocol";
import { mapSequential } from "@proto-kit/common";
import {
  combineMethodName,
  MethodIdResolver,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { Memoize } from "typescript-memoize";

import { TransactionProvingTask } from "../tasks/TransactionProvingTask";
import { FlowCreator } from "../../../worker/flow/Flow";
import { TransactionReductionTask } from "../tasks/TransactionReductionTask";
import { TransactionTrace } from "../tracing/TransactionTracingService";

import { ReductionTaskFlow } from "./ReductionTaskFlow";
import { TransactionFlow } from "./TransactionFlow";

// TODO Rename to TransactionFlow
@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockFlow {
  public constructor(
    private readonly flowCreator: FlowCreator,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("Runtime")
    private readonly runtime: Runtime<RuntimeModulesRecord>,
    private readonly runtimeFlow: TransactionFlow,
    private readonly transactionTask: TransactionProvingTask,
    private readonly transactionMergeTask: TransactionReductionTask,
    @inject("MethodIdResolver")
    private readonly methodIdResolver: MethodIdResolver
  ) {}

  private dummyProof: TransactionProof | undefined = undefined;

  private async dummyTransactionProof() {
    if (this.dummyProof !== undefined) {
      return this.dummyProof;
    }

    const flow = this.flowCreator.createFlow("transaction-dummy", undefined);
    const dummy = await flow.withFlow<TransactionProof>(async (resolve) => {
      await flow.pushTask(this.transactionTask, "dummy", async (result) => {
        resolve(result);
      });
    });
    this.dummyProof = dummy;
    return dummy;
  }

  @Memoize()
  private getMethodNameBuckets() {
    return this.runtime.bucketRuntimeMethods(
      this.methodIdResolver
        .getAllRuntimeMethodNames()
        .map(({ moduleName, methodName }) =>
          combineMethodName(moduleName, methodName)
        )
    );
  }

  private findZkProgramIndex(trace: TransactionTrace) {
    const methodName = this.methodIdResolver.getMethodNameFromId(
      trace.runtime.tx.methodId.toBigInt()
    )!;

    return this.getMethodNameBuckets().findIndex((bucket) =>
      bucket.includes(combineMethodName(methodName[0], methodName[1]))
    );
  }

  private chunkTransactions(tracesInput: TransactionTrace[]) {
    const chunks = [];
    const traces = tracesInput.slice().reverse();

    while (traces.length > 0) {
      const first = traces.pop()!;
      const firstZkProgramIndex = this.findZkProgramIndex(first);

      const second = traces.at(-1);
      let secondZkProgramIndex = -1;
      if (second !== undefined) {
        secondZkProgramIndex = this.findZkProgramIndex(second);
      }

      if (
        second !== undefined &&
        secondZkProgramIndex === firstZkProgramIndex
      ) {
        traces.pop();
        chunks.push([first, second]);
      } else {
        chunks.push([first]);
      }
    }

    return chunks;
  }

  private async proveTransactions(height: string, traces: TransactionTrace[]) {
    const traceChunks = this.chunkTransactions(traces);

    const flow = new ReductionTaskFlow(
      {
        name: `transaction-${height}`,
        inputLength: traceChunks.length,
        mappingTask: this.transactionTask,
        reductionTask: this.transactionMergeTask,
        mergableFunction: (a, b) =>
          a.publicOutput.eternalTransactionsHash
            .equals(b.publicInput.eternalTransactionsHash)
            .and(
              a.publicOutput.incomingMessagesHash.equals(
                b.publicInput.incomingMessagesHash
              )
            )
            .toBoolean(),
      },
      this.flowCreator
    );

    await mapSequential(traceChunks, async (traceChunk, index) => {
      await this.runtimeFlow.proveRuntimes(
        traceChunk,
        height,
        index,
        async (result) => {
          await flow.pushInput(result);
        }
      );
    });

    return flow;
  }

  public async createTransactionProof(
    height: string,
    trace: TransactionTrace[],
    callback: (proof: TransactionProof) => Promise<void>
  ) {
    if (trace.length === 0) {
      const proof = await this.dummyTransactionProof();
      await callback(proof);
    } else {
      const flow = await this.proveTransactions(height, trace);
      flow.onCompletion(async (result) => {
        await callback(result);
      });
    }
  }
}
