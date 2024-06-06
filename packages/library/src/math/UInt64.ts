import { Field, Gadgets } from "o1js";

import { UIntConstructor, UInt } from "./UInt";

export class UInt64 extends UInt<64> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt64({ value });
    },
  };

  public static Safe = {
    fromField(value: Field) {
      const uint = new UInt64({ value });
      UInt64.check(uint);
      return uint;
    },
  };

  public static check(x: { value: Field }) {
    UInt.assertionFunction(Gadgets.isDefinitelyInRangeN(64, x.value));
  }

  public static from(x: UInt64 | bigint | number | string) {
    if (x instanceof UInt64) {
      return x;
    }
    return new UInt64({ value: UInt.checkConstant(Field(x), 64) });
  }

  public static get zero() {
    return UInt64.Unsafe.fromField(Field(0));
  }

  public static get max() {
    return UInt64.Unsafe.fromField(UInt.maxIntField(64));
  }

  public constructorReference(): UIntConstructor<64> {
    return UInt64;
  }

  public numBits(): 64 {
    return 64;
  }
}
