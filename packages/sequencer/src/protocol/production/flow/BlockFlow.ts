import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  MandatoryProtocolModulesRecord,
  Protocol,
  TransactionProof,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { MAX_FIELD } from "@proto-kit/common";

import { TransactionProvingTask } from "../tasks/TransactionProvingTask";
import { TransactionProvingTaskParameters } from "../tasks/serializers/types/TransactionProvingTypes";
import { FlowCreator } from "../../../worker/flow/Flow";
import { BlockTrace } from "../tracing/BlockTracingService";
import { TransactionReductionTask } from "../tasks/TransactionReductionTask";

import { ReductionTaskFlow } from "./ReductionTaskFlow";
import { TransactionFlow } from "./TransactionFlow";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockFlow {
  public constructor(
    private readonly flowCreator: FlowCreator,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly transactionProvingTask: TransactionProvingTask,
    private readonly transactionReductionTask: TransactionReductionTask,
    private readonly transactionFlow: TransactionFlow
  ) {}

  private async dummyTransactionProof(trace: BlockTrace) {
    const publicInput = {
      ...trace.blockParams.publicInput,
      networkStateHash: Field(0),
      transactionsHash: Field(0),
      blockHashRoot: Field(0),
      blockNumber: MAX_FIELD,
    } satisfies BlockProverPublicInput;

    // TODO Set publicInput.stateRoot to result after block hooks!
    const publicOutput = new BlockProverPublicOutput({
      ...publicInput,
      closed: Bool(true),
    });

    return await this.protocol.blockProver.zkProgrammable.zkProgram[0].Proof.dummy(
      publicInput,
      publicOutput,
      2
    );
  }

  private async executeTransactions(
    trace: BlockTrace
  ): Promise<
    ReductionTaskFlow<TransactionProvingTaskParameters, TransactionProof>
  > {
    const transactionFlow = new ReductionTaskFlow(
      {
        name: `transactions-${trace.height}`,
        inputLength: trace.transactions.length,
        mappingTask: this.transactionProvingTask,
        reductionTask: this.transactionReductionTask,

        mergableFunction: (a, b) =>
          a.publicOutput.transactionsHash
            .equals(b.publicInput.transactionsHash)
            .and(
              a.publicInput.networkStateHash.equals(
                b.publicInput.networkStateHash
              )
            )
            .toBoolean(),
      },
      this.flowCreator
    );

    await transactionFlow.flow.forEach(
      trace.transactions,
      async (transactionTrace, txIndex) => {
        await this.transactionFlow.proveRuntimes(
          transactionTrace,
          trace.height,
          txIndex,
          async (parameters) => {
            await transactionFlow.pushInput(parameters);
          }
        );
      }
    );

    return transactionFlow;
  }

  public async executeBlock(
    trace: BlockTrace,
    callback: (proof: TransactionProof) => Promise<void>
  ) {
    if (trace.transactions.length === 0) {
      const proof = await this.dummyTransactionProof(trace);
      await callback(proof);
    } else {
      const flow = await this.executeTransactions(trace);
      flow.onCompletion(async (result) => {
        await callback(result);
      });
    }
  }
}
