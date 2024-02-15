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

  @Mutation(() => String, {
    description: "Adds a transaction to the mempool and validates it",
  })
  public submitTx(@Arg("tx") tx: TransactionObject): string {
    const decoded = PendingTransaction.fromJSON(tx);
    this.mempool.add(decoded);

    return decoded.hash().toString();
  }

  @Query(() => String, {
    description: "Returns the state of a given transaction",
  })
  public async transactionState(
    @Arg("hash", {
      description: "The hash of the transaction to be queried for",
    })
    hash: string
  ) {
    const txs = await this.mempool.getTxs();
    const tx = txs.find((x) => x.hash().toString() === hash);

    if (tx) {
      return "pending";
    }

    return "unknown";
  }

  @Query(() => [String], {
    description:
      "Returns the hashes of all transactions that are currently inside the mempool",
  })
  public async transactions() {
    const txs = await this.mempool.getTxs();
    return txs.map((x) => x.hash().toString());
  }
}
