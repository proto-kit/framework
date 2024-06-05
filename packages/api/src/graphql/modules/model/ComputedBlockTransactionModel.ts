import { ObjectType, Field } from "type-graphql";
import { ComputedBlockTransaction } from "@proto-kit/sequencer";
import { IsBoolean } from "class-validator";

import { TransactionObject } from "../MempoolResolver";

@ObjectType()
export class ComputedBlockTransactionModel {
  public static fromServiceLayerModel(cbt: ComputedBlockTransaction) {
    const { tx, status, statusMessage } = cbt;
    return new ComputedBlockTransactionModel(
      TransactionObject.fromServiceLayerModel(tx),
      status,
      statusMessage
    );
  }

  @Field(() => TransactionObject)
  public tx: TransactionObject;

  @Field()
  @IsBoolean()
  public status: boolean;

  @Field(() => String, { nullable: true })
  public statusMessage: string | undefined;

  public constructor(
    tx: TransactionObject,
    status: boolean,
    statusMessage: string | undefined
  ) {
    this.tx = tx;
    this.status = status;
    this.statusMessage = statusMessage;
  }
}
