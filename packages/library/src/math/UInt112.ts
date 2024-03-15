import { Field, UInt32, UInt64 } from "o1js";

import { UIntX } from "./UInt";

export class UInt112 extends UIntX<UInt112> {
  public static get NUM_BITS() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return 112;
  }

  public numBits() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return 112;
  }

  /**
   * Static method to create a {@link UIntX} with value `0`.
   */
  public static get zero() {
    return UInt112.from(Field(0));
  }

  /**
   * Static method to create a {@link UIntX} with value `1`.
   */
  public static get one() {
    return UInt112.from(Field(1));
  }

  public static MAXINT(): UInt112 {
    return new UInt112(UIntX.maxIntField(UInt112.NUM_BITS));
  }

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(UInt112.NUM_BITS);
    UIntX.assertionFunction(actual.equals(x.value));
  }

  public static from(
    x: Field | UInt32 | UInt64 | UInt112 | bigint | number | string
  ): UInt112 {
    if (x instanceof UInt64 || x instanceof UInt32 || x instanceof UInt112) {
      x = x.value;
    }
    return new UInt112(UInt112.checkConstant(Field(x), UInt112.NUM_BITS));
  }

  public constructor(value: Field) {
    super(value, {
      creator: (x) => new UInt112(x),
      from: (x) => UInt112.from(x),
    });
  }
}
