import {Field, isReady, PrivateKey, Scalar, shutdown, Signature} from "snarkyjs";
import {CompressedSignature} from "../mempool/CompressedSignature.js";

describe("MemPool", () => {

    beforeAll(async () => {
        await isReady
    })

    describe("PrivateMempool", () => {



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