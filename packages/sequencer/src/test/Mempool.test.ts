import { Field, isReady, PrivateKey, shutdown, Signature, UInt64 } from "snarkyjs";
import { CompressedSignature } from "../mempool/CompressedSignature.js";
import { UnsignedTransaction } from "../mempool/PendingTransaction.js";

describe("memPool", () => {

  beforeAll(async () => {
    await isReady;
  });

  describe("pendingTransaction", () => {

    it("pending- and UnsignedTransition should output the same signature data and hash", () => {

      const pk = PrivateKey.random();
      const unsigned = new UnsignedTransaction({
        methodId: Field(12),
        nonce: UInt64.one,
        sender: pk.toPublicKey(),
        args: [Field(13), Field(14)]
      });

      const data = unsigned.getSignatureData();
      const hash = unsigned.hash();

      const signed = unsigned.sign(pk);

      expect(data).toEqual(signed.getSignatureData());
      expect(hash).toEqual(signed.hash());

    });

  });

  describe("compressedSignature", () => {

    it("should serialize and deserialize correctly", () => {

      const pk = PrivateKey.random();
      const message = [Field(1), Field(2)];
      const sig = Signature.create(pk, message);
      const compressed = CompressedSignature.fromSignature(sig);
      const sig2 = compressed.toSignature();

      expect(sig2.verify(pk.toPublicKey(), message).toBoolean()).toBe(true);

    });
  });

  afterAll(() => {
    setTimeout(shutdown, 10);
  });

});