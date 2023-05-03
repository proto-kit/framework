import {Field, Poseidon, PrivateKey, PublicKey, Signature, Struct, UInt64} from "snarkyjs";
import {structArrayToFields} from "../Utils.js";

export class UnsignedTransaction {

    methodId: Field
    nonce: UInt64
    sender: PublicKey
    args: Field[]

    constructor(data: {
        methodId: Field,
        nonce: UInt64,
        sender: PublicKey,
        args: Field[]
    }) {
        this.methodId = data.methodId
        this.nonce = data.nonce
        this.sender = data.sender
        this.args = data.args
    }

    argsHash() : Field {
        return Poseidon.hash(this.args)
    }

    hash() : Field{
        return Poseidon.hash([
            this.methodId, ...this.sender.toFields(), this.nonce.value, this.argsHash()
        ])
    }

    getSignatureData() : Field[]{
        return [this.hash()] //Could also be the raw elements, not sure
    }

    sign(privateKey: PrivateKey) : PendingTransaction{
        let signature = Signature.create(privateKey, this.getSignatureData())
        return this.signed(signature)
    }

    signed(signature: Signature) : PendingTransaction{
        return new PendingTransaction({
            methodId: this.methodId,
            sender: this.sender,
            nonce: this.nonce,
            signature: signature,
            args: this.args
        })
    }

}

type PendingTransactionJSONType = {
    methodId: string,
    nonce: string,
    sender: string,
    args: string[],
    signature: {
        r: string,
        s: string
    }
}

export class PendingTransaction extends UnsignedTransaction {

    signature: Signature

    constructor(data: {
        methodId: Field,
        nonce: UInt64,
        sender: PublicKey,
        signature: Signature,
        args: Field[]
    }) {
        super(data)
        this.signature = data.signature
    }

    static fromJSON(obj: PendingTransactionJSONType) : PendingTransaction {

        return new PendingTransaction({
            methodId: Field.fromJSON(obj.methodId),
            nonce: UInt64.fromJSON(obj.nonce),
            sender: PublicKey.fromJSON(obj.sender),
            args: obj.args.map(x => Field.fromJSON(x)),
            signature: Signature.fromJSON(obj.signature)
        })
    }

    toJSON() : PendingTransactionJSONType {
        return {
            methodId: this.methodId.toJSON(),
            nonce: this.nonce.toJSON(),
            sender: this.sender.toJSON(),
            args: this.args.map(x => x.toJSON()),
            signature: this.signature.toJSON()
        }
    }

}