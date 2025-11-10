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
  hash: Field,
}) {
  public static create(input: {
    methodId: Field;
    argsHash: Field;
    nonce: UInt64Option;
    sender: PublicKeyOption;
  }) {
    const { methodId, argsHash, nonce, sender } = input;
    return new RuntimeTransaction({
      methodId,
      argsHash,
      nonce,
      sender,
      hash: Poseidon.hash([
        methodId,
        ...sender.value.toFields(),
        ...nonce.value.toFields(),
        argsHash,
      ]),
    });
  }

  public static fromTransaction(input: {
    methodId: Field;
    argsHash: Field;
    nonce: UInt64;
    sender: PublicKey;
  }) {
    const { methodId, argsHash } = input;
    const nonce = UInt64Option.fromSome(input.nonce);
    const sender = PublicKeyOption.fromSome(input.sender);
    return new RuntimeTransaction({
      methodId,
      argsHash,
      nonce,
      sender,
      hash: Poseidon.hash([
        methodId,
        ...sender.value.toFields(),
        ...nonce.value.toFields(),
        argsHash,
      ]),
    });
  }

  public static fromMessage({
    methodId,
    argsHash,
  }: {
    methodId: Field;
    argsHash: Field;
  }) {
    const nonce = UInt64Option.none(UInt64.zero);
    const sender = PublicKeyOption.none(EMPTY_PUBLICKEY);
    return new RuntimeTransaction({
      methodId,
      argsHash,
      nonce,
      sender,
      hash: Poseidon.hash([
        methodId,
        ...sender.value.toFields(),
        ...nonce.value.toFields(),
        argsHash,
      ]),
    });
  }

  public static dummyTransaction(): RuntimeTransaction {
    const methodId = Field(0);
    const nonce = new UInt64Option({
      isSome: Bool(true),
      value: UInt64.zero,
    });
    const sender = new PublicKeyOption({
      isSome: Bool(true),
      value: EMPTY_PUBLICKEY,
    });
    const argsHash = Field(0);
    return new RuntimeTransaction({
      methodId,
      argsHash,
      nonce,
      sender,
      hash: Poseidon.hash([
        methodId,
        ...sender.value.toFields(),
        ...nonce.value.toFields(),
        argsHash,
      ]),
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

  public isDummy(): Bool {
    return this.methodId.equals(0);
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
      hash: Poseidon.hash(fields),
    });
  }
}
