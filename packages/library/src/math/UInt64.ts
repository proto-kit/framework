import { Field, UInt32, UInt64 as o1UInt64 } from "o1js";

import { UIntX } from "./UInt";

export class UInt64 extends UIntX<UInt64> {
  public static get NUM_BITS() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return 64;
  }

  public numBits() {
    return 64;
  }

  /**
   * Static method to create a {@link UIntX} with value `0`.
   */
  public static get zero() {
    return UInt64.from(Field(0));
  }

  /**
   * Static method to create a {@link UIntX} with value `1`.
   */
  public static get one() {
    return UInt64.from(Field(1));
  }

  public static MAXINT(): UInt64 {
    return new UInt64(UIntX.maxIntField(UInt64.NUM_BITS));
  }

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(UInt64.NUM_BITS);
    UIntX.assertionFunction(actual.equals(x.value));
  }

  public static from(
    x: Field | UInt32 | o1UInt64 | UInt64 | bigint | number | string
  ): UInt64 {
    if (x instanceof UInt64 || x instanceof UInt32 || x instanceof o1UInt64) {
      x = x.value;
    }
    return new UInt64(UInt64.checkConstant(Field(x), UInt64.NUM_BITS));
  }

  public constructor(value: Field) {
    super(value, {
      creator: (x) => new UInt64(x),
      from: (x) => UInt64.from(x),
    });
  }
}
