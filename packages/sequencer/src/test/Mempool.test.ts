import {Field, isReady, PrivateKey, PublicKey, Scalar, shutdown, Signature, UInt64} from "snarkyjs";
import {CompressedSignature} from "../mempool/CompressedSignature.js";
import {UnsignedTransaction} from "../mempool/PendingTransaction.js";

describe("MemPool", () => {

    beforeAll(async () => {
        await isReady
    })

    describe("PendingTransaction", () => {

        it("Pending- and UnsignedTransition should output the same signature data and hash", () => {

            let pk = PrivateKey.random()
            let unsigned = new UnsignedTransaction({
                methodId: Field(12),
                nonce: UInt64.one,
                sender: pk.toPublicKey(),
                args: [Field(13), Field(14)]
            })

            let data = unsigned.getSignatureData()
            let hash = unsigned.hash()

            let signed = unsigned.sign(pk)

            expect(data).toEqual(signed.getSignatureData())
            expect(hash).toEqual(signed.hash())

        })

    })

    describe("CompressedSignature", () => {

        it("should serialize and deserialize correctly", () => {

            let pk = PrivateKey.random()
            let msg = [Field(1), Field(2)]
            let sig = Signature.create(pk, msg)
            let compressed = CompressedSignature.fromSignature(sig)
            let sig2 = compressed.toSignature()

            expect(sig2.verify(pk.toPublicKey(), msg).toBoolean()).toBeTruthy()

        })
    })

    afterAll(() => {
        setTimeout(shutdown, 10)
    })

})