import { ReturnType } from "@proto-kit/protocol";
import { Field, UInt32, UInt64 as o1UInt64 } from "o1js";
import { createUIntX } from "./UInt";

type X = ReturnType<typeof createUIntX>

export class UInt64 extends createUIntX(64) {

}

// export class UInt64 extends UIntX<UInt64> {
//   public static get NUM_BITS() {
//     // eslint-disable-next-line @typescript-eslint/no-magic-numbers
//     return 64;
//   }
//
//   public numBits() {
//     return 64;
//   }
//
//   /**
//    * Static method to create a {@link UIntX} with value `0`.
//    */
//   public static get zero() {
//     return UInt64.from(Field(0));
//   }
//
//   public static classReference = UInt64;
//
//   /**
//    * Static method to create a {@link UIntX} with value `1`.
//    */
//   public static get one() {
//     return UInt64.from(Field(1));
//   }
//
//   public static MAXINT(): UInt64 {
//     return new UInt64(UIntX.maxIntField(UInt64.NUM_BITS));
//   }
//
//   public static check(x: { value: Field }) {
//     const actual = x.value.rangeCheckHelper(UInt64.NUM_BITS);
//     UIntX.assertionFunction(actual.equals(x.value));
//   }
//
//   public constructor(value: Field) {
//     super(value);
//   }
// }
