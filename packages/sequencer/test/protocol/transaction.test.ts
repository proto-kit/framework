import { PendingTransaction, UnsignedTransaction } from "../../src/mempool/PendingTransaction";
import { RuntimeTransaction } from "@proto-kit/protocol";
import { Field, Poseidon, PublicKey, UInt64 } from "snarkyjs";

describe("tx objects hash equality", () => {
  it("should produce the same hash", () => {
    expect.assertions(1);

    const data = {
      methodId: Field(1234),
      args: [Field(1), Field(6676)],
      sender: PublicKey.empty(),
      nonce: UInt64.from(100)
    };

    const tx1 = new UnsignedTransaction({ ...data });

    const tx2 = new RuntimeTransaction({ ...data, argsHash: tx1.argsHash() });

    expect(tx1.hash()).toStrictEqual(tx2.hash());
  })
})