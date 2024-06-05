import { Bool, ProvableExtended, PublicKey, Struct, UInt64 } from "o1js";

function genericOptionFactory<Type>(valueType: ProvableExtended<Type>) {
  return class Generic extends Struct({
    isSome: Bool,
    value: valueType,
  }) {
    public static fromSome(value: Type) {
      return new Generic({
        isSome: Bool(true),
        value,
      });
    }

    public static none(value: Type) {
      return new Generic({
        isSome: Bool(false),
        value,
      });
    }
  };
}

export class UInt64Option extends genericOptionFactory<UInt64>(UInt64) {}

export class PublicKeyOption extends genericOptionFactory<PublicKey>(
  PublicKey
) {}
