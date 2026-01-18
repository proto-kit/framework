import { Field, UInt64 } from "o1js";

import { createUnion } from "../../src/union/union";

describe("union", () => {
  it("should serialize correctly", () => {
    const provable = createUnion([Field, UInt64]);
    const p = provable.from(UInt64, UInt64.from(1));
    // const p2 = provable.from(UInt32, UInt32.from(1));

    const uint = p.into(UInt64);
    const x = uint.add(UInt64.from(2)).toString();

    expect(x).toBe("3");
  });
});
