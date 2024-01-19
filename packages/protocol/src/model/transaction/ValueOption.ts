import {
  Bool,
  ProvableExtended,
  PublicKey,
  Struct,
  UInt64
} from "o1js";

// type StructType<T> = typeof Struct<{
//   isSome: typeof Bool;
//   value: FlexibleProvablePure<T>;
// }>;
function genericValueOption<T>(valueType: ProvableExtended<T>) {
  return class Generic extends Struct({
    isSome: Bool,
    value: valueType,
  }) {
    public static fromValue(value: T){
      return new Generic({
        isSome: Bool(true),
        value
      })
    }

    public static notSome(value: T) {
      return new Generic({
        isSome: Bool(false),
        value
      })
    }
  };
}

export class UInt64Option extends genericValueOption<UInt64>(UInt64) {}

export class PublicKeyOption extends genericValueOption<PublicKey>(PublicKey) {}

// export class UInt64Option extends Struct({
//   isSome: Bool,
//   value: UInt64,
// }) {}
//
// export class PublicKeyOption extends Struct({
//   isSome: Bool,
//   value: PublicKey,
// }) {}
