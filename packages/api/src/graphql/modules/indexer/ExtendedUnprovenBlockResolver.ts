import { Arg, Field, ObjectType, Query } from "type-graphql";
import { UnprovenBlockStorage } from "@proto-kit/indexer";
import { inject } from "tsyringe";

import { UnprovenBlockWithMetadataModel } from "../model/UnprovenBlockWithMetadataModel";
import { GraphqlModule, graphqlModule } from "../../GraphqlModule";

@ObjectType()
export class PaginatedUnprovenBlockWithMetadataModel {
  @Field(() => [UnprovenBlockWithMetadataModel])
  public items: UnprovenBlockWithMetadataModel[];

  @Field()
  public totalCount: number;

  public constructor(
    items: UnprovenBlockWithMetadataModel[],
    totalCount: number
  ) {
    this.items = items;
    this.totalCount = totalCount;
  }
}

@graphqlModule()
export class ExtendedUnprovenBlockResolver extends GraphqlModule<object> {
  public constructor(
    @inject("UnprovenBlockStorage")
    private readonly unprovenBlockStorage: UnprovenBlockStorage
  ) {
    super();
  }

  @Query(() => PaginatedUnprovenBlockWithMetadataModel, {
    nullable: true,
    description:
      "Queries for blocks that have been sequenced and included into the chain",
  })
  public async blocks(
    @Arg("take", {
      defaultValue: 10,
    })
    take: number,
    @Arg("skip", {
      nullable: true,
    })
    skip?: number,
    @Arg("hash", {
      nullable: true,
    })
    hash?: string,
    @Arg("height", {
      nullable: true,
    })
    height?: string,
    @Arg("hideEmpty", {
      nullable: true,
    })
    hideEmpty?: boolean
  ) {
    const blocks = await this.unprovenBlockStorage.getBlocks(
      { take, skip },
      { hash, height, hideEmpty }
    );

    if (!blocks.totalCount)
      return new PaginatedUnprovenBlockWithMetadataModel([], 0);

    const mappedBlocks = blocks.items
      .filter((block) => block)
      .map((block) => {
        return UnprovenBlockWithMetadataModel.fromServiceLayerModel(block!);
      });

    return new PaginatedUnprovenBlockWithMetadataModel(
      mappedBlocks,
      blocks.totalCount
    );
  }
}
