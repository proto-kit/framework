import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
} from "type-graphql";
import { inject } from "tsyringe";
import { IsNumberString } from "class-validator";
import {
  Mempool,
  PendingTransaction,
  TransactionStorage,
} from "@proto-kit/sequencer";

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

enum InclusionStatus {
  UNKNOWN = "unknown",
  PENDING = "pending",
  INCLUDED = "included",
  SETTLED = "settled",
}

registerEnumType(InclusionStatus, {
  name: "InclusionStatus",
});

@graphqlModule()
export class MempoolResolver extends GraphqlModule {
  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage
  ) {
    super();
  }

  @Mutation(() => String)
  public async submitTx(@Arg("tx") tx: TransactionObject): Promise<string> {
    const decoded = PendingTransaction.fromJSON(tx);
    await this.mempool.add(decoded);

    return decoded.hash().toString();
  }

  @Query(() => InclusionStatus)
  public async transactionState(
    @Arg("hash") hash: string
  ): Promise<InclusionStatus> {
    const txs = await this.mempool.getTxs();
    const tx = txs.find((x) => x.hash().toString() === hash);

    if (tx) {
      return InclusionStatus.PENDING;
    }

    const dbTx = await this.transactionStorage.findTransaction(hash);

    if (dbTx !== undefined) {
      if (dbTx.batch !== undefined) {
        return InclusionStatus.SETTLED;
      }
      if (dbTx.block !== undefined) {
        return InclusionStatus.INCLUDED;
      }
    }

    return InclusionStatus.UNKNOWN;
  }

  @Query(() => [String])
  public async transactions() {
    const txs = await this.mempool.getTxs();
    return txs.map((x) => x.hash().toString());
  }
}
