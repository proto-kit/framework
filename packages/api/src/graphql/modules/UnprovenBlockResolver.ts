import { inject } from "tsyringe";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlock,
  UnprovenBlockStorage,
} from "@proto-kit/sequencer";
import { Arg, Query } from "type-graphql";

import { GraphqlModule, graphqlModule } from "../GraphqlModule";

import { UnprovenBlockModel } from "./model/UnprovenBlockModel";

@graphqlModule()
export class UnprovenBlockResolver extends GraphqlModule<object> {
  public constructor(
    @inject("UnprovenBlockStorage")
    private readonly blockStorage: HistoricalUnprovenBlockStorage &
      UnprovenBlockStorage
  ) {
    super();
  }

  @Query(() => UnprovenBlockModel, {
    nullable: true,
    description:
      "Queries for blocks that have been sequenced and included into the chain",
  })
  public async block(
    @Arg("height", () => Number, {
      nullable: true,
      description: "Filters the blocks for a specific height",
    })
    height: number | undefined,
    @Arg("hash", () => String, {
      nullable: true,
      description: "Filters the blocks for a specific hash",
    })
    hash: string | undefined
  ) {
    let block: UnprovenBlock | undefined;

    if (hash !== undefined) {
      block = await this.blockStorage.getBlock(hash);
    } else {
      const blockHeight =
        height ?? (await this.blockStorage.getCurrentBlockHeight()) - 1;

      block = await this.blockStorage.getBlockAt(blockHeight);
    }

    if (block !== undefined) {
      return UnprovenBlockModel.fromServiceLayerModel(block);
    }
    return undefined;
  }
}
