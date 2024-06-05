import { inject } from "tsyringe";
import { Arg, Field, ObjectType, Query } from "type-graphql";
import {
  BlockStorage,
  HistoricalBlockStorage,
  ComputedBlock,
} from "@proto-kit/sequencer";
import { MOCK_PROOF } from "@proto-kit/common";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";

import {
  UnprovenBlockModel,
  UnprovenBlockResolver,
} from "./UnprovenBlockResolver";

@ObjectType()
export class ComputedBlockModel {
  public static fromServiceLayerModel(
    { bundles, proof }: ComputedBlock,
    blocks: (UnprovenBlockModel | undefined)[]
  ): ComputedBlockModel {
    return new ComputedBlockModel(
      bundles.map((bundle) => blocks.find((block) => block?.hash === bundle)!),
      proof.proof === MOCK_PROOF ? "mock-proof" : JSON.stringify(proof)
    );
  }

  @Field(() => [UnprovenBlockModel])
  public bundles: UnprovenBlockModel[];

  @Field()
  public proof: string;

  public constructor(bundles: UnprovenBlockModel[], proof: string) {
    this.bundles = bundles;
    this.proof = proof;
  }
}

@graphqlModule()
export class BlockStorageResolver extends GraphqlModule {
  // TODO seperate these two block interfaces
  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage & HistoricalBlockStorage,
    private readonly unprovenResolver: UnprovenBlockResolver
  ) {
    super();
  }

  @Query(() => ComputedBlockModel, { nullable: true })
  public async settlements(
    @Arg("height", () => Number, { nullable: true })
    height: number | undefined
  ) {
    const blockHeight =
      height ?? (await this.blockStorage.getCurrentBlockHeight()) - 1;

    const batch = await this.blockStorage.getBlockAt(blockHeight);

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
