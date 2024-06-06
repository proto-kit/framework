import { Bool, Field, Poseidon, PublicKey, Struct, UInt64 } from "o1js";
import { EMPTY_PUBLICKEY, EMPTY_PUBLICKEY_X } from "@proto-kit/common";

import { PublicKeyOption, UInt64Option } from "./ValueOption";

/**
 * This struct is used to expose transaction information to the runtime method
 * execution. This class has not all data included in transactions on purpose.
 * For example, we don't want to expose the signature or args as fields.
 */
export class RuntimeTransaction extends Struct({
  methodId: Field,
  argsHash: Field,
  nonce: UInt64Option,
  sender: PublicKeyOption,
}) {
  public static fromTransaction(input: {
    methodId: Field;
    argsHash: Field;
    nonce: UInt64;
    sender: PublicKey;
  }) {
    return new RuntimeTransaction({
      methodId: input.methodId,
      argsHash: input.argsHash,
      nonce: UInt64Option.fromSome(input.nonce),
      sender: PublicKeyOption.fromSome(input.sender),
    });
  }

  public static fromMessage({
    methodId,
    argsHash,
  }: {
    methodId: Field;
    argsHash: Field;
  }) {
    return new RuntimeTransaction({
      methodId,
      argsHash,
      nonce: UInt64Option.none(UInt64.zero),
      sender: PublicKeyOption.none(EMPTY_PUBLICKEY),
    });
  }

  public static dummyTransaction(): RuntimeTransaction {
    return new RuntimeTransaction({
      methodId: Field(0),
      nonce: new UInt64Option({
        isSome: Bool(true),
        value: UInt64.zero,
      }),
      sender: new PublicKeyOption({
        isSome: Bool(true),
        value: EMPTY_PUBLICKEY,
      }),
      argsHash: Field(0),
    });
  }

  public assertTransactionType(isMessage: Bool) {
    const isTransaction = isMessage.not();
    // isSome has to be true when it is a transaction, otherwise false
    this.nonce.isSome
      .equals(isTransaction)
      .assertTrue("Nonce is not right option isSome for type");
    this.sender.isSome
      .equals(isTransaction)
      .assertTrue("Sender is not right option isSome for type");
    this.sender.value.x
      .equals(EMPTY_PUBLICKEY_X)
      .equals(isMessage)
      .assertTrue("Transaction sender is not set to dummy");
  }

  public hashData(): Field[] {
    return [
      this.methodId,
      ...this.sender.value.toFields(),
      ...this.nonce.value.toFields(),
      this.argsHash,
    ];
  }

  public static fromHashData(fields: Field[]) {
    // sender is 2nd and the first element is x (2nd isOdd)
    const isMessage = fields[1].equals(EMPTY_PUBLICKEY_X);
    return new RuntimeTransaction({
      methodId: fields[0],
      sender: new PublicKeyOption({
        isSome: isMessage.not(),
        value: PublicKey.fromFields([fields[1], fields[2]]),
      }),
      nonce: new UInt64Option({
        isSome: isMessage.not(),
        value: UInt64.fromFields([fields[3]]),
      }),
      argsHash: fields[4],
    });
  }

  public hash(): Field {
    return Poseidon.hash(this.hashData());
  }
}
