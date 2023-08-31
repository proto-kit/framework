import { UIntX } from "./UInt";
import { Field, UInt32, UInt64 } from "snarkyjs";
import { UInt112 } from "./UInt112";

export class UInt224 extends UIntX<UInt224> {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  public static NUM_BITS = 112;

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
    actual.assertEquals(x.value);
  }

  public static from(
    x: Field | UInt32 | UInt64 | UInt224 | bigint | number | string
  ): UInt224 {
    if (x instanceof UInt64 || x instanceof UInt32 || x instanceof UInt224) {
      x = x.value;
    }
    return new UInt224(UInt224.checkConstant(Field(x), UInt224.NUM_BITS));
  }

  public constructor(value: Field) {
    super(value, UInt224.NUM_BITS, {
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