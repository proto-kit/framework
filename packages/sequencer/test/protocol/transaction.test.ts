import { Field, PublicKey, UInt64 } from "o1js";

import { UnsignedTransaction } from "../../src/mempool/PendingTransaction";

describe("tx objects hash equality", () => {
  it("should produce the same hash", () => {
    expect.assertions(1);

    const data = {
      methodId: Field(1234),
      argsFields: [Field(1), Field(6676)],
      argsJSON: [],
      isMessage: false,
      sender: PublicKey.empty<typeof PublicKey>(),
      nonce: UInt64.from(100),
    };

    const tx1 = new UnsignedTransaction({ ...data });

    const tx2 = tx1.toRuntimeTransaction();

    expect(tx1.hash()).toStrictEqual(tx2.hash());
  });
});
