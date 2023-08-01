import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Proof } from "snarkyjs";
import { BlockProverPublicInput, BlockProverPublicOutput } from "@yab/protocol";

import { PairingMapReduceFlow } from "../../worker/manager/PairingMapReduceFlow";
import { TaskQueue } from "../../worker/queue/TaskQueue";

import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { RuntimeProofParameters } from "./tasks/RuntimeTaskParameters";
import {
  BlockProvingTask,
  RuntimeProvingTask,
  StateTransitionTask,
} from "./tasks/BlockProvingTask";
import type { TransactionTrace } from "./BlockProducerModule";

/**
 * We could rename this into BlockCreationStategy and enable the injection of
 * different creation strategies.
 */
@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockTaskFlowService {
  public constructor(
    @inject("TaskQueue") private readonly taskQueue: TaskQueue,
    private readonly stateTransitionTask: StateTransitionTask,
    private readonly runtimeProvingTask: RuntimeProvingTask,
    private readonly blockProvingTask: BlockProvingTask
  ) {}

  public async executeBlockCreation(
    transactionTraces: TransactionTrace[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: number
  ): Promise<Proof<BlockProverPublicInput, BlockProverPublicOutput>> {
    // Init tasks based on traces
    const mappedInputs = transactionTraces.map<
      [
        StateTransitionProofParameters,
        RuntimeProofParameters,
        BlockProverPublicInput
      ]
    >((trace) => [
      trace.stateTransitionProver,
      trace.runtimeProver,
      trace.blockProver,
    ]);

    // eslint-disable-next-line no-warning-comments
    // TODO Find solution for multiple parallel blocks
    const flow = new PairingMapReduceFlow(this.taskQueue, "block", {
      firstPairing: this.stateTransitionTask,
      secondPairing: this.runtimeProvingTask,
      reducingTask: this.blockProvingTask,
    });

    const taskIds = mappedInputs.map((input) => input[1].tx.hash().toString());

    const proof = await flow.executePairingMapReduce(mappedInputs, taskIds);

    // Exceptions?
    await flow.close();

    return proof;
  }
}
