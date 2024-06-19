import { Field, InputType, ObjectType } from "type-graphql";
import { IsNumberString } from "class-validator";
import { PendingTransaction } from "@proto-kit/sequencer";

@ObjectType()
@InputType("SignatureInput")
export class Signature {
  @Field()
  @IsNumberString()
  public r: string;

  @Field()
  @IsNumberString()
  public s: string;

  public constructor(r: string, s: string) {
    this.r = r;
    this.s = s;
  }
}

@ObjectType()
@InputType("TransactionModel")
export class TransactionModel {
  public static fromServiceLayerModel(pt: PendingTransaction) {
    const {
      methodId,
      sender,
      nonce,
      signature,
      argsFields,
      argsJSON,
      isMessage,
    } = pt.toJSON();
    return new TransactionModel(
      pt.hash().toString(),
      methodId,
      sender,
      nonce,
      signature,
      argsFields,
      argsJSON,
      isMessage
    );
  }

  @Field()
  public hash: string;

  @Field()
  @IsNumberString()
  public methodId: string;

  @Field()
  public sender: string;

  @Field()
  @IsNumberString()
  public nonce: string;

  @Field(() => Signature)
  public signature: Signature;

  @Field(() => [String])
  public argsFields: string[];

  @Field(() => [String])
  public argsJSON: string[];

  @Field()
  public isMessage: boolean;

  public constructor(
    hash: string,
    methodId: string,
    sender: string,
    nonce: string,
    signature: Signature,
    argsFields: string[],
    argsJSON: string[],
    isMessage: boolean
  ) {
    this.hash = hash;
    this.methodId = methodId;
    this.sender = sender;
    this.nonce = nonce;
    this.signature = signature;
    this.argsFields = argsFields;
    this.argsJSON = argsJSON;
    this.isMessage = isMessage;
  }
}
