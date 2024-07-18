import { inject } from "tsyringe";
import { Arg, Field, ObjectType, Query } from "type-graphql";
import {
  Batch,
  BatchStorage,
  HistoricalBatchStorage,
} from "@proto-kit/sequencer";
import { MOCK_PROOF } from "@proto-kit/common";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";

import {
  BlockModel,
  BlockResolver,
} from "./BlockResolver";

@ObjectType()
export class ComputedBlockModel {
  public static fromServiceLayerModel(
    { bundles, proof }: Batch,
    blocks: (BlockModel | undefined)[]
  ): ComputedBlockModel {
    return new ComputedBlockModel(
      bundles.map((bundle) => blocks.find((block) => block?.hash === bundle)!),
      proof.proof === MOCK_PROOF ? "mock-proof" : JSON.stringify(proof)
    );
  }

  @Field(() => [BlockModel])
  public bundles: BlockModel[];

  @Field()
  public proof: string;

  public constructor(bundles: BlockModel[], proof: string) {
    this.bundles = bundles;
    this.proof = proof;
  }
}

@graphqlModule()
export class BatchStorageResolver extends GraphqlModule {
  // TODO seperate these two block interfaces
  public constructor(
    @inject("BlockStorage")
    private readonly batchStorage: BatchStorage & HistoricalBatchStorage,
    private readonly unprovenResolver: BlockResolver
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
      height ?? (await this.batchStorage.getCurrentBlockHeight()) - 1;

    const batch = await this.batchStorage.getBlockAt(blockHeight);

    if (batch !== undefined) {
      const blocks = await Promise.all(
        batch.bundles.map((bundle) =>
          // TODO Find a graphql-native way of doing this relational 1-n mapping
          this.unprovenResolver.block(undefined, bundle)
        )
      );
      return ComputedBlockModel.fromServiceLayerModel(batch, blocks);
    }
    return undefined;
  }
}
