import { Bool, Field, Scalar, Signature, Struct, UInt64 } from "o1js";

import { RuntimeTransaction } from "./RuntimeTransaction";

export class AuthorizedTransaction extends Struct({
  transaction: RuntimeTransaction,
  signature: Signature,
  isMessage: Bool,
}) {
  public static getSignatureData(args: {
    methodId: Field;
    nonce: UInt64;
    argsHash: Field;
  }): Field[] {
    // No isMessage here - we don't sign that
    return [args.methodId, ...args.nonce.value.toFields(), args.argsHash];
  }

  public static dummy(): AuthorizedTransaction {
    return new AuthorizedTransaction({
      transaction: RuntimeTransaction.dummyTransaction(),

      signature: Signature.fromObject({
        s: Scalar.from(0),
        r: Field(0),
      }),

      isMessage: Bool(false),
    });
  }

  public hash(): Field {
    return this.transaction.hash();
  }

  public getSignatureData(): Field[] {
    const { methodId, argsHash, nonce } = this.transaction;
    return AuthorizedTransaction.getSignatureData({
      nonce: nonce.value,
      methodId,
      argsHash,
    });
  }

  public validateAuthorization(): Bool {
    return this.signature
      .verify(this.transaction.sender.value, this.getSignatureData())
      .or(this.isMessage);
  }
}
