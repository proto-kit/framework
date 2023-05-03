import {Arg, Args, ArgsType, Field, InputType, Mutation, ObjectType, Query, Resolver} from "type-graphql";
import {Mempool} from "../Mempool.js";
import {PendingTransaction} from "../PendingTransaction.js";
import {inject, injectable} from "tsyringe";
import {GraphqlModule} from "../../graphql/GraphqlModule.js";
import {IsNumberString} from "class-validator";

@InputType()
class Signature {

    @Field()
    @IsNumberString()
    r: string

    @Field()
    @IsNumberString()
    s: string

    constructor(r: string, s: string) {
        this.r = r;
        this.s = s;
    }
}

@InputType()
class TransactionObject {

    @Field()
    @IsNumberString()
    methodId: string

    @Field()
    sender: string

    @Field()
    @IsNumberString()
    nonce: string

    @Field(type => Signature)
    signature: Signature

    @Field(type => [String])
    args: string[]

    constructor(methodId: string, sender: string, nonce: string, signature: any, args: string[]) {
        this.methodId = methodId;
        this.sender = sender;
        this.nonce = nonce;
        this.signature = signature;
        this.args = args;
    }
}

@injectable()
@Resolver(TransactionObject)
export class MempoolResolver implements GraphqlModule<typeof MempoolResolver> {

    resolverType = MempoolResolver

    mempool: Mempool
    constructor(@inject("mempool") mempool: Mempool) {
        this.mempool = mempool
    }

    @Mutation(returns => String)
    submitTx(@Arg("tx") tx: TransactionObject) : string {

        let decoded = PendingTransaction.fromJSON(tx)
        let mempoolCommitment = this.mempool.add(decoded)

        return decoded.hash().toString()

    }

    @Query(returns => String)
    transactionState(
        @Arg("hash") hash: string
    ) {
        let tx = this.mempool.getTxs().txs.find(x => x.hash().toString() === hash) //TODO Not very performant
        if(tx){
            return "pending"
        }else{
            return "unknown"
        }
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