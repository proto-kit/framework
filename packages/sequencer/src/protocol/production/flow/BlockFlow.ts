import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  TransactionProof,
} from "@proto-kit/protocol";
import { mapSequential } from "@proto-kit/common";
// eslint-disable-next-line import/no-extraneous-dependencies
import chunk from "lodash/chunk";

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
    private readonly runtimeFlow: TransactionFlow,
    private readonly transactionTask: TransactionProvingTask,
    private readonly transactionMergeTask: TransactionReductionTask
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

  private async proveTransactions(height: string, traces: TransactionTrace[]) {
    const flow = new ReductionTaskFlow(
      {
        name: `transaction-${height}`,
        inputLength: Math.ceil(traces.length / 2),
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

    await mapSequential(chunk(traces, 2), async (traceChunk, index) => {
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
