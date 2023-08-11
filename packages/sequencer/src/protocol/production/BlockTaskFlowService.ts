import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Proof } from "snarkyjs";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  MethodPublicOutput, StateTransitionProof,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
} from "@proto-kit/protocol";

import { TaskQueue } from "../../worker/queue/TaskQueue";

import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { RuntimeProofParameters } from "./tasks/RuntimeTaskParameters";
import type { TransactionTrace } from "./BlockProducerModule";
import { FlowCreator } from "../../worker/flow/Flow";
import { StateTransitionReductionTask, StateTransitionTask } from "./tasks/StateTransitionTask";
import { RuntimeProvingTask } from "./tasks/RuntimeProvingTask";
import { BlockProvingTask, BlockReductionTask } from "./tasks/BlockProvingTask";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;
type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

/**
 * We could rename this into BlockCreationStategy and enable the injection of
 * different creation strategies.
 */
@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockTaskFlowService {
  public constructor(
    @inject("TaskQueue") private readonly taskQueue: TaskQueue,
    private readonly flowCreator: FlowCreator,
    private readonly stateTransitionTask: StateTransitionTask,
    private readonly stateTransitionReductionTask: StateTransitionReductionTask,
    private readonly runtimeProvingTask: RuntimeProvingTask,
    private readonly blockProvingTask: BlockProvingTask,
    private readonly blockReductionTask: BlockReductionTask
  ) {}

  public async executeFlow(
    transactionTraces: TransactionTrace[],
    blockId: number
  ){
    const flow = this.flowCreator.createFlow(String(blockId), {
      pairings: transactionTraces.map<{
        runtimeProof?: RuntimeProof;
        // numSTProofs: number;
        stProof?: StateTransitionProof;
      }>((trace) => {
        return {
          runtimeProof: undefined,
          // numSTProofs: trace.stateTransitionProver.length,
          stProof: undefined,
        };
      }),

      stReduction: transactionTraces.map(trace => {
        return {
          numSTProofs: trace.stateTransitionProver.length,
          numMergesCompleted: 0,
          queue: [] as StateTransitionProof[],
        }
      }),

      reductionQueue: new Array<BlockProof>(),
    });

    const computedResult = await flow.withFlow<BlockProof>(async (resolve) => {
      const resolveStReduction = async (index: number) => {
        let reductionInfo = flow.state.stReduction[index];

        console.log(reductionInfo.queue.length);

        while (reductionInfo.queue.length >= 2) {
          const taskParameters: Pair<StateTransitionProof> = [
            reductionInfo.queue[0],
            reductionInfo.queue[1],
          ];
          reductionInfo.queue = reductionInfo.queue.slice(2);
          await flow.pushTask(
            reductionTask,
            taskParameters,
            async (result) => {

              if (reductionInfo.numMergesCompleted == reductionInfo.numSTProofs - 1) {
                // Do pairing and block task
                // resolve(reductionInfo.queue[0]);
              } else {
                flow.state.reductionQueue.push(result);
                await resolveReduction();
              }
            }
          );
        }
      }

      // const resolveReduction = async () => {
      //   let reductions = flow.state.reductionQueue;
      //
      //   console.log(reductions.length);
      //
      //   if (reductions.length === 1 && flow.tasksInProgress === 0) {
      //     resolve(reductions[0]);
      //   }
      //
      //   while (reductions.length >= 2) {
      //     const taskParameters: [bigint, bigint] = [
      //       reductions[0],
      //       reductions[1],
      //     ];
      //     reductions = reductions.slice(2);
      //     // We additionally have to set it here,
      //     // because this loop mights be interrupted
      //     flow.state.reductionQueue = reductions;
      //     await flow.pushTask(
      //       reductionTask,
      //       taskParameters,
      //       async (result) => {
      //         flow.state.reductionQueue.push(result);
      //         await resolveReduction();
      //       }
      //     );
      //   }
      // };

      // const resolvePairings = async (index: number) => {
      //   const [first, second] = flow.state.pairings[index];
      //
      //   if (first !== undefined && second !== undefined) {
      //     console.log(`Found pairing ${index}`);
      //
      //     await flow.pushTask(
      //       mulTask,
      //       {
      //         input1: first,
      //         input2: second,
      //         params: undefined,
      //       },
      //       async (result) => {
      //         flow.state.reductionQueue.push(result);
      //         await resolveReduction();
      //       }
      //     );
      //   }
      // };

      // const

      await flow.forEach(transactionTraces, async (trace, index) => {
        await flow.pushTask(this.runtimeProvingTask, trace.runtimeProver, async (result) => {
          flow.state.pairings[index].runtimeProof = result;
          await resolvePairings(index);
        });

        await flow.forEach(trace.stateTransitionProver, async (stTrace) => {
          await flow.pushTask(this.stateTransitionTask, stTrace, async (result) => {
            flow.state.stReduction[index].queue.push(result);
            await resolveStReduction(index);
          });
        })
      });
    });
  }

  public async executeBlockCreation(
    transactionTraces: TransactionTrace[],
    blockId: number
  ): Promise<Proof<BlockProverPublicInput, BlockProverPublicOutput>> {
    // Init tasks based on traces
    const mappedInputs = transactionTraces.map<
      [
        StateTransitionProofParameters,
        RuntimeProofParameters,
        BlockProverParameters
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

    const proof = await flow.executePairingMapReduce(
      String(blockId),
      mappedInputs,
      taskIds
    );

    // Exceptions?
    await flow.close();

    return proof;
  }
}
