import { ObjectType, Field } from "type-graphql";
import { IsBoolean } from "class-validator";
import { TransactionExecutionResult } from "@proto-kit/sequencer";

import { TransactionObject } from "../MempoolResolver";

@ObjectType()
export class TransactionExecutionResultModel {
  public static fromServiceLayerModel(
    cbt: Pick<TransactionExecutionResult, "tx" | "status" | "statusMessage">
  ) {
    const { tx, status, statusMessage } = cbt;
    return new TransactionExecutionResultModel(
      TransactionObject.fromServiceLayerModel(tx),
      status.toBoolean(),
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
