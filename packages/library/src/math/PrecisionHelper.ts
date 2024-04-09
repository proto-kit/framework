import { UInt112 } from "./UInt112";
import { UInt224 } from "./UInt224";

// export class PrecisionUInt112 extends UInt112 {
//   public static fromUInt112(uint: UInt112){
//     return new PrecisionUInt112({ value: uint.value })
//   }
//
//   public static get precision(): PrecisionUInt112 {
//     return new PrecisionUInt112({ value: UInt112.MAXINT().value });
//   }
//
//   public mulPrecision(y: UInt112): PrecisionUInt224 {
//     return PrecisionUInt224.fromUInt224(
//       UInt224.Unsafe.fromField(this.value).mul(UInt224.Unsafe.fromField(y.value))
//     )
//   }
// }
//
// export class PrecisionUInt224 extends UInt224 {
//   public static get precision(): PrecisionUInt224 {
//     return new PrecisionUInt224({ value: UInt224.MAXINT().value });
//   }
//
//   public static fromUInt224(uint: UInt224){
//     return new PrecisionUInt224({ value: uint.value })
//   }

  // public divPrecision(y: UInt112) : PrecisionUInt112 {
  //   return new PrecisionUInt112(
  //     this.div(UInt224.from(y.value)).toUInt112().value
  //   )
  // }
// }