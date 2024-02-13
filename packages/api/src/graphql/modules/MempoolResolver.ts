/* eslint-disable new-cap,id-length */
import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { inject, injectable } from "tsyringe";
import { IsNumberString } from "class-validator";
import { Mempool, PendingTransaction } from "@proto-kit/sequencer";

import { graphqlModule, GraphqlModule } from "../GraphqlModule.js";

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
@InputType("TransactionObjectInput")
export class TransactionObject {
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
    return new TransactionObject(
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
    methodId: string,
    sender: string,
    nonce: string,
    signature: Signature,
    argsFields: string[],
    argsJSON: string[],
    isMessage: boolean
  ) {
    this.methodId = methodId;
    this.sender = sender;
    this.nonce = nonce;
    this.signature = signature;
    this.argsFields = argsFields;
    this.argsJSON = argsJSON;
    this.isMessage = isMessage;
  }
}

@graphqlModule()
export class MempoolResolver extends GraphqlModule {
  public constructor(@inject("Mempool") private readonly mempool: Mempool) {
    super();
  }

  @Mutation(() => String)
  public submitTx(@Arg("tx") tx: TransactionObject): string {
    const decoded = PendingTransaction.fromJSON(tx);
    this.mempool.add(decoded);

    return decoded.hash().toString();
  }

  @Query(() => String)
  public async transactionState(@Arg("hash") hash: string) {
    const txs = await this.mempool.getTxs();
    const tx = txs.find((x) => x.hash().toString() === hash);

    if (tx) {
      return "pending";
    }

    return "unknown";
  }

  @Query(() => [String])
  public async transactions() {
    const txs = await this.mempool.getTxs();
    return txs.map((x) => x.hash().toString());
  }

  // @Query(returns => [TransactionObject])
  // transaction(
  //     @Arg("hash") hash: string
  // ){
  //
  // eslint-disable-next-line max-len
  //     let tx = this.mempool.getTxs().txs.find(x => x.hash().toString() === hash) //TODO Not very performant
  //
  //     if(tx){
  //         let parsed = tx.toJSON()
  //         return [parsed]
  //     }else{
  //         return []
  //     }
  // }
}
