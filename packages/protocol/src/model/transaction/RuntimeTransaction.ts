import { Field, Poseidon, PublicKey, Struct, UInt64 } from "o1js";

import { ProtocolTransaction } from "./ProtocolTransaction";

/**
 * This struct is used to expose transaction information to the runtime method
 * execution. This class has not all data included in transactions on purpose.
 * For example, we don't want to expose the signature or args as fields.
 */
export class RuntimeTransaction extends Struct({
  methodId: Field,
  nonce: UInt64,
  sender: PublicKey,
  argsHash: Field,
}) {
  public static fromProtocolTransaction({
    methodId,
    nonce,
    sender,
    argsHash,
  }: ProtocolTransaction): RuntimeTransaction {
    return new RuntimeTransaction({
      methodId,
      nonce,
      sender,
      argsHash,
    });
  }

  public static dummy(): RuntimeTransaction {
    return new RuntimeTransaction({
      methodId: Field(0),
      nonce: UInt64.zero,
      sender: PublicKey.empty(),
      argsHash: Field(0),
    });
  }

  public hash(): Field {
    return Poseidon.hash([
      this.methodId,
      ...this.sender.toFields(),
      ...this.nonce.toFields(),
      this.argsHash,
    ]);
  }
}
