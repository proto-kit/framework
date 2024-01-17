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
    return [args.methodId, ...args.nonce.toFields(), args.argsHash];
  }

  public static dummy(): SignedTransaction {
    return new SignedTransaction({
      transaction: RuntimeTransaction.dummy(),

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
    return SignedTransaction.getSignatureData(this.transaction);
  }

  public validateSignature(): Bool {
    return this.signature.verify(
      this.transaction.sender,
      this.getSignatureData()
    );
  }
}
