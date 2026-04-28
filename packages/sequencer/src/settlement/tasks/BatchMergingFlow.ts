import { injectable } from "tsyringe";
import { JsonProof } from "o1js";
import { mapSequential } from "@proto-kit/common";
import { BlockProof } from "@proto-kit/protocol";

import { Batch } from "../../storage/model/Batch";
import { FlowCreator } from "../../worker/flow/Flow";
import { BlockReductionTask } from "../../protocol/production/tasks/BlockReductionTask";
import { BlockProofSerializer } from "../../protocol/production/tasks/serializers/BlockProofSerializer";
import { ReductionTaskFlow } from "../../protocol/production/flow/ReductionTaskFlow";

@injectable()
export class BatchMergingFlow {
  public constructor(
    private readonly flowCreator: FlowCreator,
    private readonly blockReductionTask: BlockReductionTask,
    private readonly blockProofSerializer: BlockProofSerializer
  ) {}

  public async mergeBatches(batches: Batch[]): Promise<Batch> {
    const serializer = this.blockProofSerializer.getBlockProofSerializer();

    const flow = new ReductionTaskFlow(
      {
        name: `batch-merge-${batches[0].height}`,
        inputLength: batches.length,
        mappingFunction: async (input: JsonProof) =>
          await serializer.fromJSONProof(input),
        reductionTask: this.blockReductionTask,
        mergableFunction: (a, b) => {
          return a.publicOutput.stateRoot
            .equals(b.publicInput.stateRoot)
            .toBoolean();
        },
      },
      this.flowCreator
    );

    const resultPromise = new Promise<BlockProof>((res, rej) => {
      flow.onCompletion(async (result) => res(result));
    });

    await mapSequential(
      batches,
      async (batch) => await flow.pushInput(batch.proof)
    );

    const result = await resultPromise;

    return {
      proof: await serializer.toJSONProof(result),
      height: batches[0].height,
      blockHashes: batches.flatMap((batch) => batch.blockHashes),
      createdAt: Date.now(),
    };
  }
}
