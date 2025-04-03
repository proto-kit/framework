import { inject } from "tsyringe";
import { Arg, Field, ObjectType, Query } from "type-graphql";
import {
  Batch,
  BatchStorage,
  HistoricalBatchStorage,
} from "@proto-kit/sequencer";
import { MOCK_PROOF } from "@proto-kit/common";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";

import { BlockModel, BlockResolver } from "./BlockResolver";

@ObjectType()
export class ComputedBlockModel {
  public static fromServiceLayerModel(
    { blockHashes, proof }: Batch,
    blocks: (BlockModel | undefined)[]
  ): ComputedBlockModel {
    return new ComputedBlockModel(
      blockHashes.map(
        (blockHash) => blocks.find((block) => block?.hash === blockHash)!
      ),
      proof.proof === MOCK_PROOF ? MOCK_PROOF : JSON.stringify(proof)
    );
  }

  @Field(() => [BlockModel])
  public blocks: BlockModel[];

  @Field()
  public proof: string;

  public constructor(blocks: BlockModel[], proof: string) {
    this.blocks = blocks;
    this.proof = proof;
  }
}

@graphqlModule()
export class BatchStorageResolver extends GraphqlModule {
  // TODO seperate these two block interfaces
  public constructor(
    @inject("BatchStorage")
    private readonly batchStorage: BatchStorage & HistoricalBatchStorage,
    private readonly blockResolver: BlockResolver
  ) {
    super();
  }

  @Query(() => ComputedBlockModel, {
    nullable: true,
    description:
      "Returns previously computed batches of blocks used for settlement",
  })
  public async batches(
    @Arg("height", () => Number, {
      nullable: true,
      description: "Filters the batches for a specific height",
    })
    height: number | undefined
  ) {
    const blockHeight =
      height ?? (await this.batchStorage.getCurrentBatchHeight()) - 1;

    const batch = await this.batchStorage.getBatchAt(blockHeight);

    if (batch !== undefined) {
      const blocks = await Promise.all(
        batch.blockHashes.map((blockHash) =>
          // TODO Find a graphql-native way of doing this relational 1-n mapping
          this.blockResolver.block(undefined, blockHash)
        )
      );
      return ComputedBlockModel.fromServiceLayerModel(batch, blocks);
    }
    return undefined;
  }
}
