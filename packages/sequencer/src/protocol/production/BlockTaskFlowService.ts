import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Proof } from "snarkyjs";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  MethodPublicOutput,
  StateTransitionProof,
} from "@proto-kit/protocol";

import { TaskQueue } from "../../worker/queue/TaskQueue";
import { Flow, FlowCreator } from "../../worker/flow/Flow";
import { PairTuple } from "../../helpers/utils";

import type { TransactionTrace } from "./BlockProducerModule";
import {
  StateTransitionReductionTask,
  StateTransitionTask,
} from "./tasks/StateTransitionTask";
import { RuntimeProvingTask } from "./tasks/RuntimeProvingTask";
import {
  BlockProverParameters,
  BlockProvingTask,
  BlockReductionTask,
} from "./tasks/BlockProvingTask";
import { log } from "@proto-kit/common";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;
type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

interface ReductionFlowState<ProofType> {
  numProofs: number;
  numMergesCompleted: number;
  queue: ProofType[];
}

interface BlockProductionFlowState {
  pairings: {
    runtimeProof?: RuntimeProof;
    stProof?: StateTransitionProof;
    blockArguments: BlockProverParameters;
  }[];
  stReduction: ReductionFlowState<StateTransitionProof>[];
  blockReduction: ReductionFlowState<BlockProof>;
}

/**
 * We could rename this into BlockCreationStategy and enable the injection of
 * different creation strategies.
 */
@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockTaskFlowService {
  // eslint-disable-next-line max-params
  public constructor(
    @inject("TaskQueue") private readonly taskQueue: TaskQueue,
    private readonly flowCreator: FlowCreator,
    private readonly stateTransitionTask: StateTransitionTask,
    private readonly stateTransitionReductionTask: StateTransitionReductionTask,
    private readonly runtimeProvingTask: RuntimeProvingTask,
    private readonly blockProvingTask: BlockProvingTask,
    private readonly blockReductionTask: BlockReductionTask
  ) {}

  public async pushPairing(
    flow: Flow<BlockProductionFlowState>,
    index: number
  ) {
    const { runtimeProof, stProof, blockArguments } =
      flow.state.pairings[index];

    if (runtimeProof !== undefined && stProof !== undefined) {
      console.log(`Found pairing ${index}`);

      await flow.pushTask(
        this.blockProvingTask,
        {
          input1: stProof,
          input2: runtimeProof,
          params: blockArguments,
        },
        async (result) => {
          flow.state.blockReduction.queue.push(result);
          await this.resolveBlockReduction(flow);
        }
      );
    }
  }

  public async resolveBlockReduction(flow: Flow<BlockProductionFlowState>) {
    const reductions = flow.state.blockReduction;

    console.log(reductions.queue.length);

    if (
      reductions.numProofs - reductions.numMergesCompleted === 1 &&
      flow.tasksInProgress === 0
    ) {
      flow.resolve(reductions.queue[0]);
      return;
    }

    if (reductions.queue.length >= 2) {
      const taskParameters: PairTuple<BlockProof> = [
        reductions.queue[0],
        reductions.queue[1],
      ];
      reductions.queue = reductions.queue.slice(2);
      await flow.pushTask(
        this.blockReductionTask,
        taskParameters,
        async (result) => {
          flow.state.blockReduction.queue.push(result);
          flow.state.blockReduction.numMergesCompleted += 1;
          await this.resolveBlockReduction(flow);
        }
      );
    }
  }

  public async resolveSTReduction(
    flow: Flow<BlockProductionFlowState>,
    index: number
  ) {
    const reductionInfo = flow.state.stReduction[index];

    if (reductionInfo.queue.length >= 2) {
      const taskParameters: PairTuple<StateTransitionProof> = [
        reductionInfo.queue[0],
        reductionInfo.queue[1],
      ];
      reductionInfo.queue = reductionInfo.queue.slice(2);
      await flow.pushTask(
        this.stateTransitionReductionTask,
        taskParameters,
        async (result) => {
          reductionInfo.numMergesCompleted += 1;
          log.debug(
            `${reductionInfo.numMergesCompleted} from ${reductionInfo.numProofs} ST Reductions completed `
          );

          if (
            reductionInfo.numMergesCompleted ===
            reductionInfo.numProofs - 1
          ) {
            // Do pairing and block task
            flow.state.pairings[index].stProof = result;
            await this.pushPairing(flow, index);
          } else {
            reductionInfo.queue.push(result);
            await this.resolveSTReduction(flow, index);
          }
        }
      );
    }
  }

  public async executeFlow(
    transactionTraces: TransactionTrace[],
    blockId: number
  ): Promise<BlockProof> {
    const flow = this.flowCreator.createFlow<BlockProductionFlowState>(
      String(blockId),
      {
        pairings: transactionTraces.map((trace) => ({
          runtimeProof: undefined,
          stProof: undefined,
          blockArguments: trace.blockProver,
        })),

        stReduction: transactionTraces.map((trace) => ({
          numProofs: trace.stateTransitionProver.length,
          numMergesCompleted: 0,
          queue: [],
        })),

        blockReduction: {
          queue: [],
          numMergesCompleted: 0,
          numProofs: transactionTraces.length,
        },
      }
    );

    return await flow.withFlow<BlockProof>(async () => {
      await flow.forEach(transactionTraces, async (trace, index) => {
        await flow.pushTask(
          this.runtimeProvingTask,
          trace.runtimeProver,
          async (result) => {
            flow.state.pairings[index].runtimeProof = result;
            await this.pushPairing(flow, index);
          }
        );

        await flow.forEach(trace.stateTransitionProver, async (stTrace) => {
          await flow.pushTask(
            this.stateTransitionTask,
            stTrace,
            async (result) => {
              if (flow.state.stReduction[index].numProofs === 1) {
                flow.state.pairings[index].stProof = result;
                await this.pushPairing(flow, index);
              } else {
                flow.state.stReduction[index].queue.push(result);
                await this.resolveSTReduction(flow, index);
              }
            }
          );
        });
      });
    });
  }
}
