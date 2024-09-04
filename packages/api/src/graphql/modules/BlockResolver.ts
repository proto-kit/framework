import { inject } from "tsyringe";
import {
  HistoricalBlockStorage,
  Block,
  BlockStorage,
} from "@proto-kit/sequencer";
import { Arg, Query } from "type-graphql";

import { GraphqlModule, graphqlModule } from "../GraphqlModule";

import { BatchTransactionModel } from "./model/BatchTransactionModel";

@ObjectType()
export class BlockModel {
  public static fromServiceLayerModel(block: Block) {
    return new BlockModel(
      Number(block.networkState.during.block.height.toBigInt()),
      block.transactions.map((tx) =>
        BatchTransactionModel.fromServiceLayerModel({
          tx: tx.tx,
          status: tx.status.toBoolean(),
          statusMessage: tx.statusMessage,
        })
      ),
      block.transactionsHash.toString(),
      block.hash.toString(),
      block.previousBlockHash?.toString()
    );
  }

  @Field()
  hash: string;

  @Field(() => String, { nullable: true })
  previousBlockHash: string | undefined;

  @Field()
  height: number;

  @Field(() => [BatchTransactionModel])
  txs: BatchTransactionModel[];

  @Field()
  transactionsHash: string;

  private constructor(
    height: number,
    txs: BatchTransactionModel[],
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
export class BlockResolver extends GraphqlModule<object> {
  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: HistoricalBlockStorage & BlockStorage
  ) {
    super();
  }

  @Query(() => BlockModel, {
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
    let block: Block | undefined;

    if (hash !== undefined) {
      block = await this.blockStorage.getBlock(hash);
    } else {
      const blockHeight =
        height ?? (await this.blockStorage.getCurrentBlockHeight()) - 1;

      block = await this.blockStorage.getBlockAt(blockHeight);
    }

    if (block !== undefined) {
      return BlockModel.fromServiceLayerModel(block);
    }
    return undefined;
  }
}
