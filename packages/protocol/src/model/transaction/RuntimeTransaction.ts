import { Bool, Field, Poseidon, Provable, PublicKey, Struct, UInt64 } from "o1js";
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
      nonce: UInt64Option.fromValue(input.nonce),
      sender: PublicKeyOption.fromValue(input.sender),
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
      nonce: UInt64Option.notSome(UInt64.zero),
      sender: PublicKeyOption.notSome(PublicKey.empty()),
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
        value: PublicKey.empty(),
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
  }

  public hash(): Field {
    const full = Poseidon.hash([
      this.methodId,
      this.argsHash,
      ...this.sender.value.toFields(),
      ...this.nonce.value.toFields(),
    ]);

    const partial = Poseidon.hash([
      this.methodId,
      this.argsHash,
    ])

    return Provable.if(this.sender.isSome, full, partial);
  }
}
