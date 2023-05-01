import {Field, Poseidon, PrivateKey, PublicKey, Signature, Struct, UInt64} from "snarkyjs";
import {CompressedSignature} from "./CompressedSignature.js";

export class UnsignedTransaction extends Struct({
    methodId: Field,
    sender: PublicKey,
    nonce: UInt64,
}){

    getSignatureData() : Field[]{
        return UnsignedTransaction.toFields(this)
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
            signature: signature
        })
    }

}

export class PendingTransaction extends Struct({

    methodId: Field,
    sender: PublicKey,
    nonce: UInt64,
    signature: Signature

}){

    hash() : Field{
        return Poseidon.hash([
            this.methodId, ...this.sender.toFields(), this.nonce.value
        ])
    }

}