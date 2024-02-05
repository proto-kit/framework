import { Field, UInt32 as o1UInt32 } from "o1js";

import { UIntX } from "./UInt";

export class UInt32 extends UIntX<UInt32> {
  public static get NUM_BITS() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return 32;
  }

  public numBits() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return 32;
  }

  /**
   * Static method to create a {@link UIntX} with value `0`.
   */
  public static get zero() {
    return UInt32.from(Field(0));
  }

  /**
   * Static method to create a {@link UIntX} with value `1`.
   */
  public static get one() {
    return UInt32.from(Field(1));
  }

  public static MAXINT(): UInt32 {
    return new UInt32(UIntX.maxIntField(UInt32.NUM_BITS));
  }

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(UInt32.NUM_BITS);
    UIntX.assertionFunction(actual.equals(x.value));
  }

  public static from(
    x: Field | o1UInt32 | UInt32 | bigint | number | string
  ): UInt32 {
    if (x instanceof UInt32 || x instanceof o1UInt32) {
      x = x.value;
    }
    return new UInt32(UInt32.checkConstant(Field(x), UInt32.NUM_BITS));
  }

  public constructor(value: Field) {
    super(value, {
      creator: (x) => new UInt32(x),
      from: (x) => UInt32.from(x),
    });
  }
}
