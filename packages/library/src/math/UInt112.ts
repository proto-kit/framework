import { Field, Gadgets } from "o1js";

import { UIntConstructor, UInt } from "./UInt";
import { UInt224 } from "./UInt224";

export class UInt112 extends UInt<112> {
  public static Unsafe = {
    fromField(value: Field) {
      return new UInt112({ value });
    },
  };

  public static Safe = {
    fromField(value: Field) {
      const uint = new UInt112({ value });
      UInt112.check(uint);
      return uint;
    },
  };

  public static check(x: { value: Field }) {
    UInt.assertionFunction(Gadgets.isDefinitelyInRangeN(112, x.value));
  }

  public static from(x: UInt112 | bigint | number | string): UInt112 {
    if (x instanceof UInt112) {
      return x;
    }
    return new UInt112({ value: UInt.checkConstant(Field(x), 112) });
  }

  public static get zero() {
    return UInt112.Unsafe.fromField(Field(0));
  }

  public static get max() {
    return UInt112.Unsafe.fromField(UInt.maxIntField(112));
  }

  public constructorReference(): UIntConstructor<112> {
    return UInt112;
  }

  public numBits() {
    return 112 as const;
  }

  public toUInt224(): UInt224 {
    return UInt224.Unsafe.fromField(this.value);
  }
}
