import {
  filterNonUndefined,
  mapSequential,
  noop,
  range,
} from "@proto-kit/common";
import { inject } from "tsyringe";
import { BlockProof } from "@proto-kit/protocol";
import { JsonProof } from "o1js";

import { sequencerModule, SequencerModule } from "../builder/SequencerModule";
import { BatchMergingFlow } from "../../settlement/tasks/BatchMergingFlow";
import { PropertyStorage } from "../../storage/repositories/PropertyStorage";
import { BatchStorage } from "../../storage/repositories/BatchStorage";
import { Batch } from "../../storage/model/Batch";
import { BatchProducerModule } from "../../protocol/production/BatchProducerModule";
import { BlockProofSerializer } from "../../protocol/production/tasks/serializers/BlockProofSerializer";

export interface RecursiveProofJson {
  toBatchHeight: number;
  proof: JsonProof;
}

export interface RecursiveProof {
  toBatchHeight: number;
  proof: BlockProof;
}

const BATCH_STORAGE_KEY = "batch-recursive";

@sequencerModule()
// implements ProofOutputModule
export class RecursiveProofModule extends SequencerModule {
  public constructor(
    @inject("PropertyStorage")
    private readonly propertyStorage: PropertyStorage,
    @inject("BatchStorage")
    private readonly batchStorage: BatchStorage,
    private readonly batchMergingFlow: BatchMergingFlow,
    @inject("BatchProducerModule")
    private readonly batchProducerModule: BatchProducerModule,
    private readonly blockProofSerializer: BlockProofSerializer
  ) {
    super();
  }

  public async start() {
    noop();
  }

  public async storeProof(proof: RecursiveProofJson) {
    const str = JSON.stringify(proof);

    await this.propertyStorage.set(BATCH_STORAGE_KEY, str);
  }

  public async readProof(): Promise<RecursiveProof | undefined> {
    const json = await this.propertyStorage.get(BATCH_STORAGE_KEY);

    if (json === undefined) {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonObject: RecursiveProofJson = JSON.parse(json);

    const proof = await this.blockProofSerializer
      .getBlockProofSerializer()
      .fromJSONProof(jsonObject.proof);

    return {
      toBatchHeight: jsonObject.toBatchHeight,
      proof,
    };
  }

  public async proveRecursively() {
    const previous = await this.readProof();
    let previousBatch: Batch | undefined = undefined;
    if (previous !== undefined) {
      previousBatch = await this.batchStorage.getBatchAt(
        previous.toBatchHeight
      );
    }

    const currentHeight = await this.batchStorage.getCurrentBatchHeight();
    const previousBatchesResults = await Promise.all(
      range((previous?.toBatchHeight ?? -1) + 1, currentHeight).map((height) =>
        this.batchStorage.getBatchAt(height)
      )
    );

    const previousBatches = previousBatchesResults.filter(filterNonUndefined);
    if (previousBatches.length < previousBatchesResults.length) {
      throw new Error("Some previous batch retrieval failed");
    }

    const batches = [previousBatch, ...previousBatches].filter(
      filterNonUndefined
    );
    // TODO This is very expensive (loads of DB-trips)
    const settleableBatches = await mapSequential(
      batches,
      async (batch) =>
        await this.batchProducerModule.recoverSettleableBatch(batch)
    );

    const batch = await this.batchMergingFlow.mergeBatches(settleableBatches);

    await this.storeProof({ proof: batch.proof, toBatchHeight: batch.height });

    return batch;
  }

  // public async settleBatch(batches: SettleableBatch[]): Promise<Settlement> {
  //
  //   return {
  //
  //   }
  // }
}
