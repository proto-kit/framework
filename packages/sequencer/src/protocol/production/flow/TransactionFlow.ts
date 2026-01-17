import { injectable } from "tsyringe";

import { Flow, FlowCreator } from "../../../worker/flow/Flow";
import {
  RuntimeProof,
  TransactionProvingTaskParameters,
  TransactionProvingType,
} from "../tasks/serializers/types/TransactionProvingTypes";
import { RuntimeProvingTask } from "../tasks/RuntimeProvingTask";
import { TransactionTrace } from "../tracing/TransactionTracingService";

@injectable()
export class TransactionFlow {
  public constructor(
    private readonly flowCreator: FlowCreator,
    private readonly runtimeProvingTask: RuntimeProvingTask
  ) {}

  private async resolveTransactionFlow(
    flow: Flow<{
      runtimeProofs: { proof: RuntimeProof; index: number }[];
    }>,
    trace: TransactionTrace,
    callback: (params: TransactionProvingTaskParameters) => Promise<void>
  ) {
    const requiredLength = trace.type === TransactionProvingType.MULTI ? 2 : 1;

    if (flow.state.runtimeProofs.length === requiredLength) {
      let parameters: TransactionProvingTaskParameters;

      if (trace.type === TransactionProvingType.MULTI) {
        // Sort ascending
        const sorted = flow.state.runtimeProofs.sort(
          ({ index: a }, { index: b }) => a - b
        );
        parameters = {
          type: trace.type,
          parameters: trace.transaction,
          proof1: sorted[0].proof,
          proof2: sorted[1].proof,
        };
      } else {
        parameters = {
          type: trace.type,
          parameters: trace.transaction,
          proof1: flow.state.runtimeProofs[0].proof,
        };
      }

      await callback(parameters);
    }
  }

  public async proveRuntimes(
    trace: TransactionTrace,
    blockHeight: number,
    txIndex: number,
    callback: (params: TransactionProvingTaskParameters) => Promise<void>
  ) {
    const name = `transaction-${blockHeight}-${txIndex}${
      trace.type === TransactionProvingType.MULTI ? "-double" : ""
    }`;
    const flow = this.flowCreator.createFlow<{
      runtimeProofs: { proof: RuntimeProof; index: number }[];
    }>(name, {
      runtimeProofs: [],
    });

    await flow.pushTask(
      this.runtimeProvingTask,
      trace.runtime[0],
      async (proof) => {
        flow.state.runtimeProofs.push({ proof, index: 0 });
        await this.resolveTransactionFlow(flow, trace, callback);
      }
    );

    if (trace.type === TransactionProvingType.MULTI) {
      await flow.pushTask(
        this.runtimeProvingTask,
        trace.runtime[1],
        async (proof) => {
          flow.state.runtimeProofs.push({ proof, index: 1 });
          await this.resolveTransactionFlow(flow, trace, callback);
        }
      );
    }
  }
}
