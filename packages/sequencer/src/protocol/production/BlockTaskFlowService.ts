import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Bool, Field, Proof } from "o1js";
import {
  BlockProof,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  MandatoryProtocolModulesRecord,
  MethodPublicOutput,
  Protocol,
  StateTransitionProof,
} from "@proto-kit/protocol";
import { log, MOCK_PROOF } from "@proto-kit/common";

import { TaskQueue } from "../../worker/queue/TaskQueue";
import { Flow, FlowCreator } from "../../worker/flow/Flow";

import type { BlockTrace } from "./BlockProducerModule";
import {
  StateTransitionReductionTask,
  StateTransitionTask,
} from "./tasks/StateTransitionTask";
import { RuntimeProvingTask } from "./tasks/RuntimeProvingTask";
import {
  BlockProverParameters,
  BlockProvingTask,
  BlockProvingTaskParameters,
  BlockReductionTask,
} from "./tasks/BlockProvingTask";
import { ReductionTaskFlow } from "./flow/ReductionTaskFlow";
import {
  NewBlockProverParameters,
  NewBlockProvingParameters,
  NewBlockTask,
} from "./tasks/NewBlockTask";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;

interface BlockProductionFlowState {
  pairings: {
    runtimeProof?: RuntimeProof;
    stProof?: StateTransitionProof;
    blockArguments: BlockProverParameters;
  }[][];

  blockPairings: {
    blockProof?: BlockProof;
    stProof?: StateTransitionProof;
    provingArguments: NewBlockProverParameters;
  }[];
}

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
    private readonly transactionProvingTask: BlockProvingTask,
    private readonly blockProvingTask: NewBlockTask,
    private readonly blockReductionTask: BlockReductionTask,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>
  ) {}

  public async pushPairing(
    flow: Flow<BlockProductionFlowState>,
    transactionReductionTask: ReductionTaskFlow<
      BlockProvingTaskParameters,
      BlockProof
    >,
    blockIndex: number,
    transactionIndex: number
  ) {
    const { runtimeProof, stProof, blockArguments } =
      flow.state.pairings[blockIndex][transactionIndex];

    if (runtimeProof !== undefined && stProof !== undefined) {
      log.trace(`Found pairing block: ${blockIndex}, tx: ${transactionIndex}`);

      await transactionReductionTask.pushInput({
        input1: stProof,
        input2: runtimeProof,
        params: blockArguments,
      });
    }
  }

  public async pushBlockPairing(
    flow: Flow<BlockProductionFlowState>,
    blockReductionTask: ReductionTaskFlow<
      NewBlockProvingParameters,
      BlockProof
    >,
    index: number
  ) {
    const { blockProof, stProof, provingArguments } =
      flow.state.blockPairings[index];

    if (blockProof !== undefined && stProof !== undefined) {
      log.debug(`Found block pairing ${index}`);

      await blockReductionTask.pushInput({
        input1: stProof,
        input2: blockProof,
        params: provingArguments,
      });
    }
  }

  private createSTMergeFlow(name: string, inputLength: number) {
    return new ReductionTaskFlow(
      {
        name,
        inputLength,
        mappingTask: this.stateTransitionTask,
        reductionTask: this.stateTransitionReductionTask,

        mergableFunction: (a, b) =>
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
            .toBoolean(),
      },
      this.flowCreator
    );
  }

  public async executeFlow(
    blockTraces: BlockTrace[],
    batchId: number
  ): Promise<BlockProof> {
    const flow = this.flowCreator.createFlow<BlockProductionFlowState>(
      `main-${batchId}`,
      {
        pairings: blockTraces.map((blockTrace) =>
          blockTrace.transactions.map((trace) => ({
            runtimeProof: undefined,
            stProof: undefined,
            blockArguments: trace.blockProver,
          }))
        ),

        blockPairings: blockTraces.map((blockTrace) => ({
          blockProof: undefined,
          stProof: undefined,
          provingArguments: blockTrace.block,
        })),
      }
    );

    const blockMergingFlow = new ReductionTaskFlow(
      {
        name: `block-${batchId}`,
        inputLength: blockTraces.length,
        mappingTask: this.blockProvingTask,
        reductionTask: this.blockReductionTask,

        mergableFunction: (a, b) =>
          // TODO Proper replication of merge logic
          a.publicOutput.stateRoot
            .equals(b.publicInput.stateRoot)
            .and(
              a.publicOutput.blockHashRoot.equals(b.publicInput.blockHashRoot)
            )
            .and(
              a.publicOutput.networkStateHash.equals(
                b.publicInput.networkStateHash
              )
            )
            .and(
              a.publicOutput.eternalTransactionsHash.equals(
                b.publicInput.eternalTransactionsHash
              )
            )
            .and(a.publicOutput.closed.equals(b.publicOutput.closed))
            .toBoolean(),
      },
      this.flowCreator
    );
    blockMergingFlow.onCompletion(async (result) => {
      log.debug(`Block generation finished, with proof ${result.proof}`); // TODO Remove result logging
      flow.resolve(result);
    });
    blockMergingFlow.deferErrorsTo(flow);

    return await flow.withFlow<BlockProof>(async () => {
      await flow.forEach(blockTraces, async (blockTrace, blockNumber) => {
        if (blockTrace.transactions.length > 0) {
          const transactionMergingFlow = new ReductionTaskFlow(
            {
              name: `tx-${batchId}-${blockNumber}`,
              inputLength: blockTrace.transactions.length,
              mappingTask: this.transactionProvingTask,
              reductionTask: this.blockReductionTask,

              mergableFunction: (a, b) =>
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
                  .toBoolean(),
            },
            this.flowCreator
          );
          transactionMergingFlow.onCompletion(async (blockProof) => {
            flow.state.blockPairings[blockNumber].blockProof = blockProof;
            await this.pushBlockPairing(flow, blockMergingFlow, blockNumber);
          });
          transactionMergingFlow.deferErrorsTo(flow);

          // Execute if the block is empty
          await flow.forEach(
            blockTrace.transactions,
            async (trace, transactionIndex) => {
              // Push runtime task
              await flow.pushTask(
                this.runtimeProvingTask,
                trace.runtimeProver,
                async (result) => {
                  flow.state.pairings[blockNumber][
                    transactionIndex
                  ].runtimeProof = result;
                  await this.pushPairing(
                    flow,
                    transactionMergingFlow,
                    blockNumber,
                    transactionIndex
                  );
                }
              );

              const stReductionFlow = this.createSTMergeFlow(
                `tx-stproof-${batchId}-${blockNumber}-${transactionIndex}`,
                trace.stateTransitionProver.length
              );
              stReductionFlow.onCompletion(async (result) => {
                flow.state.pairings[blockNumber][transactionIndex].stProof =
                  result;
                await this.pushPairing(
                  flow,
                  transactionMergingFlow,
                  blockNumber,
                  transactionIndex
                );
              });
              stReductionFlow.deferErrorsTo(flow);

              await flow.forEach(trace.stateTransitionProver, async (stp) => {
                await stReductionFlow.pushInput(stp);
              });
            }
          );
        } else {
          const piObject = {
            stateRoot:
              blockTrace.stateTransitionProver[0].publicInput.stateRoot,
            networkStateHash: blockTrace.block.publicInput.networkStateHash,
            transactionsHash: Field(0),
            blockHashRoot: Field(0),

            eternalTransactionsHash:
              blockTrace.block.publicInput.eternalTransactionsHash,
            incomingMessagesHash:
              blockTrace.block.publicInput.incomingMessagesHash,
          };
          const publicInput = new BlockProverPublicInput(piObject);

          // TODO Set publicInput.stateRoot to result after block hooks!
          const publicOutput = new BlockProverPublicOutput({
            ...piObject,
            blockNumber: Field(Field.ORDER - 1n),
            closed: Bool(true),
          });

          // Provide a dummy prove is this block is empty
          const proof =
            new this.protocol.blockProver.zkProgrammable.zkProgram.Proof({
              publicInput,
              publicOutput,
              proof: MOCK_PROOF,
              maxProofsVerified: 2,
            });
          flow.state.blockPairings[blockNumber].blockProof = proof;
          await this.pushBlockPairing(flow, blockMergingFlow, blockNumber);
        }

        // Push block STs
        if (blockTrace.stateTransitionProver[0].stateTransitions.length === 0) {
          // Build a dummy proof in case no STs have been emitted
          const [{ publicInput }] = blockTrace.stateTransitionProver;

          flow.state.blockPairings[blockNumber].stProof =
            new this.protocol.stateTransitionProver.zkProgrammable.zkProgram.Proof(
              {
                publicInput,
                proof: MOCK_PROOF,
                publicOutput: publicInput,
                maxProofsVerified: 2,
              }
            );
          await this.pushBlockPairing(flow, blockMergingFlow, blockNumber);
        } else {
          const blockSTFlow = this.createSTMergeFlow(
            `block-stproof-${batchId}-${blockNumber}`,
            blockTrace.stateTransitionProver.length
          );

          blockSTFlow.onCompletion(async (result) => {
            flow.state.blockPairings[blockNumber].stProof = result;
            await this.pushBlockPairing(flow, blockMergingFlow, blockNumber);
          });
          blockSTFlow.deferErrorsTo(flow);

          await flow.forEach(blockTrace.stateTransitionProver, async (stp) => {
            await blockSTFlow.pushInput(stp);
          });
        }
      });
    });
  }
}
