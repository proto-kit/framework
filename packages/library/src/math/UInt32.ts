import { Field, Gadgets } from "o1js";

import { UIntConstructor, UInt } from "./UInt";
import { UInt64 } from "./UInt64";

export class UInt32 extends UInt<32> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt32({ value });
    },
  };

  public static Safe = {
    fromField(value: Field) {
      const uint = new UInt32({ value });
      UInt32.check(uint);
      return uint;
    },
  };

  public static check(x: { value: Field }) {
    UInt.assertionFunction(Gadgets.isDefinitelyInRangeN(32, x.value));
  }

  public static from(x: UInt32 | bigint | number | string) {
    if (x instanceof UInt32) {
      return x;
    }
    return new UInt32({ value: UInt.checkConstant(Field(x), 32) });
  }

  public static get zero() {
    return UInt32.Unsafe.fromField(Field(0));
  }

  public static get max() {
    return UInt32.Unsafe.fromField(UInt.maxIntField(32));
  }

  public constructorReference(): UIntConstructor<32> {
    return UInt32;
  }

  public numBits(): 32 {
    return 32;
  }

  public toUInt64(): UInt64 {
    return UInt64.Unsafe.fromField(this.value);
  }
}
