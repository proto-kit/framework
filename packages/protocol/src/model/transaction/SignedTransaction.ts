import { Bool, Field, Scalar, Signature, Struct, UInt64 } from "o1js";

import { RuntimeTransaction } from "./RuntimeTransaction";

export class SignedTransaction extends Struct({
  transaction: RuntimeTransaction,
  signature: Signature,
}) {
  public static getSignatureData(args: {
    methodId: Field;
    nonce: UInt64;
    argsHash: Field;
  }): Field[] {
    return [args.methodId, ...args.nonce.value.toFields(), args.argsHash];
  }

  public static dummy(): SignedTransaction {
    return new SignedTransaction({
      transaction: RuntimeTransaction.dummyTransaction(),

      signature: Signature.fromObject({
        s: Scalar.from(0),
        r: Field(0),
      }),
    });
  }

  public hash(): Field {
    return this.transaction.hash();
  }

  public getSignatureData(): Field[] {
    const { methodId, argsHash, nonce } = this.transaction;
    return SignedTransaction.getSignatureData({
      nonce: nonce.value,
      methodId,
      argsHash,
    });
  }

  public validateSignature(): Bool {
    return this.signature.verify(
      this.transaction.sender.value,
      this.getSignatureData()
    );
  }
}
