import { inject } from "tsyringe";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlock,
  UnprovenBlockStorage,
} from "@proto-kit/sequencer";
import { Arg, Field, ObjectType, Query } from "type-graphql";

import { GraphqlModule, graphqlModule } from "../GraphqlModule";

import { ComputedBlockTransactionModel } from "./model/ComputedBlockTransactionModel";

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
      ),
      unprovenBlock.transactionsHash.toString(),
      unprovenBlock.hash.toString(),
      unprovenBlock.previousBlockHash?.toString()
    );
  }

  @Field()
  hash: string;

  @Field(() => String, { nullable: true })
  previousBlockHash: string | undefined;

  @Field()
  height: number;

  @Field(() => [ComputedBlockTransactionModel])
  txs: ComputedBlockTransactionModel[];

  @Field()
  transactionsHash: string;

  private constructor(
    height: number,
    txs: ComputedBlockTransactionModel[],
    transactionsHash: string,
    hash: string,
    previousBlockHash: string | undefined
  ) {
    this.height = height;
    this.txs = txs;
    this.transactionsHash = transactionsHash;
    this.hash = hash;
    this.previousBlockHash = previousBlockHash;
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
    height: number | undefined,
    @Arg("hash", () => String, { nullable: true })
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
