import { inject } from "tsyringe";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlock,
  UnprovenBlockStorage,
} from "@proto-kit/sequencer";
import { Arg, Field, ObjectType, Query } from "type-graphql";

import { GraphqlModule, graphqlModule } from "../GraphqlModule";

import { ComputedBlockTransactionModel } from "./BlockStorageResolver";

@ObjectType()
export class UnprovenBlockModel {
  public static fromServiceLayerModel(unprovenBlock: UnprovenBlock) {
    return new UnprovenBlockModel(
      Number(unprovenBlock.networkState.during.block.height.toBigInt()),
      unprovenBlock.transactions.map((tx) =>
        ComputedBlockTransactionModel.fromServiceLayerModel({
          tx: tx.tx,
          status: tx.status.toBoolean(),
          statusMessage: tx.statusMessage,
        })
      )
    );
  }

  @Field()
  height: number;

  @Field(() => [ComputedBlockTransactionModel])
  txs: ComputedBlockTransactionModel[];

  private constructor(height: number, txs: ComputedBlockTransactionModel[]) {
    this.height = height;
    this.txs = txs;
  }
}

@graphqlModule()
export class UnprovenBlockResolver extends GraphqlModule<object> {
  public constructor(
    @inject("UnprovenBlockStorage")
    private readonly blockStorage: HistoricalUnprovenBlockStorage &
      UnprovenBlockStorage
  ) {
    super();
  }

  @Query(() => UnprovenBlockModel, { nullable: true })
  public async block(
    @Arg("height", () => Number, { nullable: true })
    height: number | undefined
  ) {
    const blockHeight =
      height ?? (await this.blockStorage.getCurrentBlockHeight()) - 1;

    const block = await this.blockStorage.getBlockAt(blockHeight);

    if (block !== undefined) {
      return UnprovenBlockModel.fromServiceLayerModel(block);
    }
    return undefined;
  }
}
