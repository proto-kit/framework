import { Arg, Field, InputType, Mutation, Query, Resolver } from "type-graphql";
import { Mempool } from "../Mempool.js";
import { PendingTransaction } from "../PendingTransaction.js";
import { inject, injectable } from "tsyringe";
import type { GraphqlModule } from "../../graphql/GraphqlModule.js";
import { IsNumberString } from "class-validator";

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
  public args: string[];

  public constructor(methodId: string, sender: string, nonce: string, signature: Signature, args: string[]) {
    this.methodId = methodId;
    this.sender = sender;
    this.nonce = nonce;
    this.signature = signature;
    this.args = args;
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
  public transactionState(
    @Arg("hash") hash: string
  ) {
    const tx = this.mempool.getTxs().txs.find(x => x.hash().toString() === hash); // TODO Not very performant

    if (tx) {
      return "pending";
    }

    return "unknown";
  }

  // @Query()
  // transactions(){
  //     let tx = this.mempool.getTxs().txs
  //     tx.map(x => x.)
  // }

  // @Query(returns => [TransactionObject])
  // transaction(
  //     @Arg("hash") hash: string
  // ){
  //
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