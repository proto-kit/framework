import { UIntX } from "./UInt";
import { Field, UInt32, UInt64 } from "o1js";
import { UInt112 } from "./UInt112";

export class UInt224 extends UIntX<UInt224> {
  public static get NUM_BITS() {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  return 224;
}

  public numBits() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return 224;
  }

  /**
   * Static method to create a {@link UIntX} with value `0`.
   */
  public static get zero() {
    return UInt224.from(Field(0));
  }

  /**
   * Static method to create a {@link UIntX} with value `1`.
   */
  public static get one() {
    return UInt224.from(Field(1));
  }

  public static MAXINT(): UInt224 {
    return new UInt224(UIntX.maxIntField(UInt224.NUM_BITS));
  }

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(UInt224.NUM_BITS);
    UIntX.assertionFunction(actual.equals(x.value));
  }

  public static from(
    x: Field | UInt32 | UInt64 | UIntX<any> | bigint | number | string
  ): UInt224 {
    if (x instanceof UInt64 || x instanceof UInt32 || x instanceof UIntX) {
      x = x.value;
    }
    return new UInt224(UInt224.checkConstant(Field(x), UInt224.NUM_BITS));
  }

  public constructor(value: Field) {
    super(value, {
      creator: (x) => new UInt224(x),
      from: (x) => UInt224.from(x),
    });
  }

  public toUInt112(): UInt112 {
    const uint112 = new UInt112(this.value);
    UInt112.check(uint112);
    return uint112;
  }
}
