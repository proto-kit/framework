import { injectable } from "tsyringe";
import { assertSizeOneOrTwo, dependencyFactory, DependencyRecord } from "@proto-kit/common";

import { Flow, FlowCreator } from "../../../worker/flow/Flow";
import {
  RuntimeProof,
  TransactionProvingTaskParameters,
} from "../tasks/serializers/types/TransactionProvingTypes";
import { RuntimeProvingTask } from "../tasks/RuntimeProvingTask";
import { TransactionTrace } from "../tracing/TransactionTracingService";

@injectable()
@dependencyFactory()
export class TransactionFlow {
  public constructor(
    private readonly flowCreator: FlowCreator,
    private readonly runtimeProvingTask: RuntimeProvingTask
  ) {}

  public static dependencies(): DependencyRecord {
    return {
      runtimeProvingTask: {
        useClass: RuntimeProvingTask,
      },
    };
  }

  private async resolveTransactionFlow(
    flow: Flow<{
      runtimeProofs: { proof: RuntimeProof; index: number }[];
    }>,
    trace: [TransactionTrace] | [TransactionTrace, TransactionTrace],
    callback: (params: TransactionProvingTaskParameters) => Promise<void>
  ) {
    const requiredLength = trace.length;

    if (flow.state.runtimeProofs.length === requiredLength) {
      let parameters: TransactionProvingTaskParameters;

      if (requiredLength === 2) {
        // Sort ascending
        const sorted = flow.state.runtimeProofs.sort(
          ({ index: a }, { index: b }) => a - b
        );

        parameters = [
          { parameters: trace[0].transaction, proof: sorted[0].proof },
          { parameters: trace[1].transaction, proof: sorted[1].proof },
        ];
      } else {
        parameters = [
          {
            parameters: trace[0].transaction,
            proof: flow.state.runtimeProofs[0].proof,
          },
        ];
      }

      await callback(parameters);
    }
  }

  public async proveRuntimes(
    trace: TransactionTrace[],
    blockHeight: string,
    txIndex: number,
    callback: (params: TransactionProvingTaskParameters) => Promise<void>
  ) {
    assertSizeOneOrTwo(trace);

    const name = `transaction-${blockHeight}-${txIndex}${
      trace.length === 2 ? "-double" : ""
    }`;
    const flow = this.flowCreator.createFlow<{
      runtimeProofs: { proof: RuntimeProof; index: number }[];
    }>(name, {
      runtimeProofs: [],
    });

    await Promise.all(
      trace.map(async (transaction, index) => {
        await flow.pushTask(
          this.runtimeProvingTask,
          transaction.runtime,
          async (proof) => {
            flow.state.runtimeProofs.push({ proof, index });
            await this.resolveTransactionFlow(flow, trace, callback);
          }
        );
      })
    );
  }
}
