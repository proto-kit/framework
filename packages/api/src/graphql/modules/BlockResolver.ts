import { inject } from "tsyringe";
import { Block, BlockStorage, PendingTransaction } from "@proto-kit/sequencer";
import { Arg, Field, ObjectType, Query } from "type-graphql";

import { GraphqlModule, graphqlModule } from "../GraphqlModule";

import { BatchTransactionModel } from "./model/BatchTransactionModel";

@ObjectType()
export class BlockModel {
  public static fromServiceLayerModel(block: Block) {
    return new BlockModel(
      Number(block.networkState.during.block.height),
      block.transactions.map((tx) =>
        BatchTransactionModel.fromServiceLayerModel({
          tx: PendingTransaction.fromJSON(tx.tx),
          status: tx.status,
          statusMessage: tx.statusMessage,
        })
      ),
      block.transactionsHash,
      block.hash,
      block.previousBlockHash
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
    private readonly blockStorage: BlockStorage
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
