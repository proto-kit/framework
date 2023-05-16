/* eslint-disable @typescript-eslint/no-use-before-define */
import { Field, Poseidon, type PrivateKey, PublicKey, Signature, UInt64 } from "snarkyjs";

export class UnsignedTransaction {
  public methodId: Field;

  public nonce: UInt64;

  public sender: PublicKey;

  public args: Field[];

  public constructor(data: { methodId: Field; nonce: UInt64; sender: PublicKey; args: Field[] }) {
    this.methodId = data.methodId;
    this.nonce = data.nonce;
    this.sender = data.sender;
    this.args = data.args;
  }

  public argsHash(): Field {
    return Poseidon.hash(this.args);
  }

  public hash(): Field {
    return Poseidon.hash([this.methodId, ...this.sender.toFields(), this.nonce.value, this.argsHash()]);
  }

  public getSignatureData(): Field[] {
    // Could also be the raw elements, not sure
    return [this.hash()];
  }

  public sign(privateKey: PrivateKey): PendingTransaction {
    const signature = Signature.create(privateKey, this.getSignatureData());
    return this.signed(signature);
  }

  public signed(signature: Signature): PendingTransaction {
    return new PendingTransaction({
      methodId: this.methodId,
      sender: this.sender,
      nonce: this.nonce,
      signature,
      args: this.args,
    });
  }
}

interface PendingTransactionJSONType {
  methodId: string;
  nonce: string;
  sender: string;
  args: string[];
  signature: {
    r: string;
    s: string;
  };
}

export class PendingTransaction extends UnsignedTransaction {
  public static fromJSON(object: PendingTransactionJSONType): PendingTransaction {
    return new PendingTransaction({
      methodId: Field.fromJSON(object.methodId),
      nonce: UInt64.from(object.nonce),
      sender: PublicKey.fromBase58(object.sender),
      args: object.args.map((x) => Field.fromJSON(x)),
      signature: Signature.fromJSON(object.signature),
    });
  }

  public signature: Signature;

  public constructor(data: { methodId: Field; nonce: UInt64; sender: PublicKey; signature: Signature; args: Field[] }) {
    super(data);
    this.signature = data.signature;
  }

  public toJSON(): PendingTransactionJSONType {
    return {
      methodId: this.methodId.toJSON(),
      nonce: this.nonce.toString(),
      sender: this.sender.toBase58(),
      args: this.args.map((x) => x.toJSON()),

      signature: {
        // eslint-disable-next-line id-length
        r: this.signature.r.toJSON(),
        // eslint-disable-next-line id-length
        s: this.signature.s.toJSON(),
      },
    };
  }
}
