import { Field } from "o1js";
import { UIntConstructor, UInt } from "./UInt";

export class UInt112 extends UInt<112> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt112({ value });
    },
  };

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(112);
    UInt.assertionFunction(actual.equals(x.value));
  }

  public static from(x: UInt<112> | bigint | number | string): UInt112 {
    if (x instanceof UInt) {
      return x;
    }
    return new UInt112({ value: UInt.checkConstant(Field(x), 112) });
  }

  public static get zero() {
    return UInt112.Unsafe.fromField(Field(0))
  }

  public constructorReference(): UIntConstructor<112> {
    return UInt112;
  }

  public numBits() {
    return 112 as const;
  }
}
