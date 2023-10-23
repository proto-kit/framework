import { Bool, Field, PublicKey, Signature, Struct, UInt64 } from "o1js";

export class ProtocolTransaction extends Struct({
  methodId: Field,
  nonce: UInt64,
  sender: PublicKey,
  argsHash: Field,
  signature: Signature,
}) {
  public static getSignatureData(args: {
    methodId: Field;
    nonce: UInt64;
    argsHash: Field;
  }): Field[] {
    return [args.methodId, ...args.nonce.toFields(), args.argsHash];
  }

  public getSignatureData(): Field[] {
    return ProtocolTransaction.getSignatureData(this);
  }

  public validateSignature(): Bool {
    return this.signature.verify(this.sender, this.getSignatureData());
  }
}
