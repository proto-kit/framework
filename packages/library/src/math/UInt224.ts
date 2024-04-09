import { Field, UInt64 } from "o1js";
import { UIntConstructor, UInt } from "./UInt";

export class UInt224 extends UInt<224> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt224({ value });
    },
  };

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(224);
    UInt.assertionFunction(actual.equals(x.value));
  }

  public static from(x: UInt<224> | bigint | number | string): UInt224 {
    if (x instanceof UInt) {
      return x;
    }
    return new UInt224({ value: UInt.checkConstant(Field(x), 224) });
  }

  public static get zero() {
    return UInt224.Unsafe.fromField(Field(0))
  }

  public constructorReference(): UIntConstructor<224> {
    return UInt224;
  }

  public numBits(): 224 {
    return 224;
  }
}
