import { Field } from "o1js";
import { UIntConstructor, UIntX } from "./UInt";

export class UInt112 extends UIntX<112> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt112({ value });
    },
  };

  public static check(x: { value: Field }) {
    const actual = x.value.rangeCheckHelper(112);
    UIntX.assertionFunction(actual.equals(x.value));
  }

  public static from(x: UIntX<112> | bigint | number | string): UInt112 {
    if (x instanceof UIntX) {
      return x;
    }
    return new UInt112({ value: UIntX.checkConstant(Field(x), 112) });
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
