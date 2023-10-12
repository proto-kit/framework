/* eslint-disable new-cap,id-length */
import { Arg, Field, InputType, Mutation, Query, Resolver } from "type-graphql";
import { inject, injectable } from "tsyringe";
import { IsNumberString } from "class-validator";

import { Mempool } from "../Mempool.js";
import { PendingTransaction } from "../PendingTransaction.js";
import type { GraphqlModule } from "../../graphql/GraphqlModule.js";

@InputType()
class Signature {
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

@InputType()
class TransactionObject {
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

  public constructor(
    methodId: string,
    sender: string,
    nonce: string,
    signature: Signature,
    argsFields: string[],
    argsJSON: string[]
  ) {
    this.methodId = methodId;
    this.sender = sender;
    this.nonce = nonce;
    this.signature = signature;
    this.argsFields = argsFields;
    this.argsJSON = argsJSON;
  }
}

@injectable()
@Resolver(TransactionObject)
export class MempoolResolver implements GraphqlModule {
  public resolverType = MempoolResolver;

  private readonly mempool: Mempool;

  public constructor(@inject("mempool") mempool: Mempool) {
    this.mempool = mempool;
  }

  @Mutation(() => String)
  public submitTx(@Arg("tx") tx: TransactionObject): string {
    const decoded = PendingTransaction.fromJSON(tx);
    this.mempool.add(decoded);

    return decoded.hash().toString();
  }

  @Query(() => String)
  public transactionState(@Arg("hash") hash: string) {
    const tx = this.mempool
      .getTxs()
      .txs.find((x) => x.hash().toString() === hash);

    if (tx) {
      return "pending";
    }

    return "unknown";
  }
}
