import { Bool, ProvableExtended, PublicKey, Struct, UInt64 } from "o1js";

// eslint-disable-next-line etc/no-t
function genericValueOption<T>(valueType: ProvableExtended<T>) {
  return class Generic extends Struct({
    isSome: Bool,
    value: valueType,
  }) {
    public static fromValue(value: T) {
      return new Generic({
        isSome: Bool(true),
        value,
      });
    }

    public static notSome(value: T) {
      return new Generic({
        isSome: Bool(false),
        value,
      });
    }
  };
}

export class UInt64Option extends genericValueOption<UInt64>(UInt64) {}

export class PublicKeyOption extends genericValueOption<PublicKey>(PublicKey) {}
