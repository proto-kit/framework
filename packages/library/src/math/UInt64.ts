import { Field } from "o1js";
import { UIntConstructor, UIntX } from "./UInt";

export class UInt64 extends UIntX<64> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt64({ value });
    },
  };

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(64);
    UIntX.assertionFunction(actual.equals(x.value));
  }

  public static from(x: UInt64 | bigint | number | string) {
    if (x instanceof UInt64) {
      return x;
    }
    return new UInt64({ value: UIntX.checkConstant(Field(x), 64) });
  }

  public static get zero() {
    return UInt64.Unsafe.fromField(Field(0))
  }

  public constructorReference(): UIntConstructor<64> {
    return UInt64;
  }

  public numBits(): 64 {
    return 64;
  }
}
