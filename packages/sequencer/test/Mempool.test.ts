import { Field, PrivateKey, Signature, UInt64 } from "o1js";

import { CompressedSignature } from "../src/mempool/CompressedSignature.js";
import { UnsignedTransaction } from "../src/mempool/PendingTransaction.js";

describe("memPool", () => {
  describe("pendingTransaction", () => {
    it("pending- and UnsignedTransition should output the same signature data and hash", () => {
      expect.assertions(2);

      const pk = PrivateKey.random();
      const unsigned = new UnsignedTransaction({
        methodId: Field(12),
        nonce: UInt64.one,
        sender: pk.toPublicKey(),
        argsFields: [Field(13), Field(14)],
        argsJSON: [],
        isMessage: false,
      });

      const data = unsigned.getSignatureData();
      const hash = unsigned.hash();

      const signed = unsigned.sign(pk);

      expect(data).toStrictEqual(signed.getSignatureData());
      expect(hash).toStrictEqual(signed.hash());
    });
  });

  describe("compressedSignature", () => {
    it("should serialize and deserialize correctly", () => {
      expect.assertions(1);

      const pk = PrivateKey.random();
      const message = [Field(1), Field(2)];
      const sig = Signature.create(pk, message);
      const compressed = CompressedSignature.fromSignature(sig);
      const sig2 = compressed.toSignature();

      expect(sig2.verify(pk.toPublicKey(), message).toBoolean()).toBe(true);
    });
  });
});
