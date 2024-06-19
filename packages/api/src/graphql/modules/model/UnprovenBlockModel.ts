import { Field, ObjectType } from "type-graphql";
import { UnprovenBlock } from "@proto-kit/sequencer";

import { ComputedBlockTransactionModel } from "./ComputedBlockTransactionModel";

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
          stateTransitions: tx.stateTransitions,
          protocolTransitions: tx.protocolTransitions,
          blockHash: unprovenBlock.hash.toString(),
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

  protected constructor(
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
