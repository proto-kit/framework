import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Proof } from "snarkyjs";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  MethodPublicOutput,
  StateTransitionProof,
} from "@proto-kit/protocol";
import { log } from "@proto-kit/common";

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

  private resolveReducibleTasks<Type>(
    pendingInputs: Type[],
    reducible: (a: Type, b: Type) => boolean
  ): {
    availableReductions: { r1: Type; r2: Type }[];
    touchedIndizes: number[];
  } {
    const res: { r1: Type; r2: Type }[] = [];

    const touchedIndizes: number[] = [];

    for (const [index, first] of pendingInputs.entries()) {
      const secondIndex = pendingInputs.findIndex(
        (second, index2) =>
          index2 > index &&
          (reducible(first, second) || reducible(second, first))
      );

      if (secondIndex > 0) {
        const r2 = pendingInputs[secondIndex];
        pendingInputs = pendingInputs.filter(
          (unused, index2) => index2 !== index && index2 !== secondIndex
        );

        const [firstElement, secondElement] = reducible(first, r2)
          ? [first, r2]
          : [r2, first];

        // eslint-disable-next-line putout/putout
        res.push({ r1: firstElement, r2: secondElement });
        touchedIndizes.push(index, secondIndex);
      }
    }

    return { availableReductions: res, touchedIndizes };
  }

  public async pushPairing(
    flow: Flow<BlockProductionFlowState>,
    index: number
  ) {
    const { runtimeProof, stProof, blockArguments } =
      flow.state.pairings[index];

    if (runtimeProof !== undefined && stProof !== undefined) {
      log.debug(`Found pairing ${index}`);

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

    if (
      reductions.numProofs - reductions.numMergesCompleted === 1 &&
      flow.tasksInProgress === 0
    ) {
      flow.resolve(reductions.queue[0]);
      return;
    }

    if (reductions.queue.length >= 2) {
      const { availableReductions, touchedIndizes } =
        this.resolveReducibleTasks(reductions.queue, (a, b) =>
          a.publicOutput.stateRoot
            .equals(b.publicInput.stateRoot)
            .and(
              a.publicOutput.transactionsHash.equals(
                b.publicInput.transactionsHash
              )
            )
            .and(
              a.publicInput.networkStateHash.equals(
                b.publicInput.networkStateHash
              )
            )
            .toBoolean()
        );

      // I don't know exactly what this rule wants from me, I suspect
      // it complains bcs the function is called forEach
      // eslint-disable-next-line unicorn/no-array-method-this-argument
      await flow.forEach(availableReductions, async (reduction) => {
        const taskParameters: PairTuple<BlockProof> = [
          reduction.r1,
          reduction.r2,
        ];
        await flow.pushTask(
          this.blockReductionTask,
          taskParameters,
          async (result) => {
            flow.state.blockReduction.queue.push(result);
            flow.state.blockReduction.numMergesCompleted += 1;
            await this.resolveBlockReduction(flow);
          }
        );
      });

      reductions.queue = reductions.queue.filter(
        (ignored, index) => !touchedIndizes.includes(index)
      );
    }
  }

  public async resolveSTReduction(
    flow: Flow<BlockProductionFlowState>,
    index: number
  ) {
    const reductionInfo = flow.state.stReduction[index];

    if (reductionInfo.queue.length >= 2) {
      const { availableReductions, touchedIndizes } =
        this.resolveReducibleTasks(reductionInfo.queue, (a, b) =>
          a.publicOutput.stateRoot
            .equals(b.publicInput.stateRoot)
            .and(
              a.publicOutput.protocolStateRoot.equals(
                b.publicInput.protocolStateRoot
              )
            )
            .and(
              a.publicOutput.stateTransitionsHash.equals(
                b.publicInput.stateTransitionsHash
              )
            )
            .toBoolean()
        );

      // eslint-disable-next-line unicorn/no-array-method-this-argument
      await flow.forEach(availableReductions, async (reduction) => {
        const taskParameters: PairTuple<StateTransitionProof> = [
          reduction.r1,
          reduction.r2,
        ];

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

        reductionInfo.queue = reductionInfo.queue.filter(
          (ignored, queueIndex) => !touchedIndizes.includes(queueIndex)
        );
      });
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
      // eslint-disable-next-line unicorn/no-array-method-this-argument
      await flow.forEach(transactionTraces, async (trace, index) => {
        await flow.pushTask(
          this.runtimeProvingTask,
          trace.runtimeProver,
          async (result) => {
            flow.state.pairings[index].runtimeProof = result;
            await this.pushPairing(flow, index);
          }
        );

        // eslint-disable-next-line unicorn/no-array-method-this-argument
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
