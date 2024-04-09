import { Field } from "o1js";
import { UIntConstructor, UIntX } from "./UInt";

export class UInt32 extends UIntX<32> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt32({ value });
    },
  };

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(32);
    UIntX.assertionFunction(actual.equals(x.value));
  }

  public static from(x: UInt32 | bigint | number | string) {
    if (x instanceof UInt32) {
      return x;
    }
    return new UInt32({ value: UIntX.checkConstant(Field(x), 32) });
  }

  public static get zero() {
    return UInt32.Unsafe.fromField(Field(0))
  }

  public constructorReference(): UIntConstructor<32> {
    return UInt32;
  }

  public numBits(): 32 {
    return 32;
  }
}
