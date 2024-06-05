import { Field, Gadgets } from "o1js";

import { UIntConstructor, UInt } from "./UInt";

export class UInt224 extends UInt<224> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt224({ value });
    },
  };

  public static Safe = {
    fromField(value: Field) {
      const uint = new UInt224({ value });
      UInt224.check(uint);
      return uint;
    },
  };

  public static check(x: { value: Field }) {
    UInt.assertionFunction(Gadgets.isDefinitelyInRangeN(224, x.value));
  }

  public static from(x: UInt<224> | bigint | number | string): UInt224 {
    if (x instanceof UInt) {
      return x;
    }
    return new UInt224({ value: UInt.checkConstant(Field(x), 224) });
  }

  public static get zero() {
    return UInt224.Unsafe.fromField(Field(0));
  }

  public static get max() {
    return UInt224.Unsafe.fromField(UInt.maxIntField(224));
  }

  public constructorReference(): UIntConstructor<224> {
    return UInt224;
  }

  public numBits(): 224 {
    return 224;
  }
}
