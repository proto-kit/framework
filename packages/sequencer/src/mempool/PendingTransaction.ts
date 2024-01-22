/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  Field,
  Poseidon,
  type PrivateKey,
  PublicKey,
  Signature,
  UInt64,
} from "o1js";
import { ProtocolTransaction } from "@proto-kit/protocol";

export class UnsignedTransaction {
  public methodId: Field;

  public nonce: UInt64;

  public sender: PublicKey;

  public argsFields: Field[];

  public argsJSON: string[];

  public constructor(data: {
    methodId: Field;
    nonce: UInt64;
    sender: PublicKey;
    argsFields: Field[];
    argsJSON: string[];
  }) {
    this.methodId = data.methodId;
    this.nonce = data.nonce;
    this.sender = data.sender;
    this.argsFields = data.argsFields;
    this.argsJSON = data.argsJSON;
  }

  public argsHash(): Field {
    return Poseidon.hash(this.argsFields);
  }

  public hash(): Field {
    return Poseidon.hash([
      this.methodId,
      ...this.sender.toFields(),
      ...this.nonce.toFields(),
      this.argsHash(),
    ]);
  }

  public getSignatureData(): Field[] {
    return ProtocolTransaction.getSignatureData({
      nonce: this.nonce,
      methodId: this.methodId,
      argsHash: this.argsHash(),
    });
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
      argsFields: this.argsFields,
      argsJSON: this.argsJSON,
    });
  }
}

interface PendingTransactionJSONType {
  methodId: string;
  nonce: string;
  sender: string;
  argsFields: string[];
  argsJSON: string[];
  signature: {
    r: string;
    s: string;
  };
}

export class PendingTransaction extends UnsignedTransaction {
  public static fromJSON(
    object: PendingTransactionJSONType
  ): PendingTransaction {
    return new PendingTransaction({
      methodId: Field.fromJSON(object.methodId),
      nonce: UInt64.from(object.nonce),
      sender: PublicKey.fromBase58(object.sender),
      argsFields: object.argsFields.map((x) => Field.fromJSON(x)),
      signature: Signature.fromJSON(object.signature),
      argsJSON: object.argsJSON,
    });
  }

  public signature: Signature;

  public constructor(data: {
    methodId: Field;
    nonce: UInt64;
    sender: PublicKey;
    signature: Signature;
    argsFields: Field[];
    argsJSON: string[];
  }) {
    super(data);
    this.signature = data.signature;
  }

  public toJSON(): PendingTransactionJSONType {
    return {
      methodId: this.methodId.toJSON(),
      nonce: this.nonce.toString(),
      sender: this.sender.toBase58(),
      argsFields: this.argsFields.map((x) => x.toJSON()),

      signature: {
        // eslint-disable-next-line id-length
        r: this.signature.r.toJSON(),
        // eslint-disable-next-line id-length
        s: this.signature.s.toJSON(),
      },

      argsJSON: this.argsJSON,
    };
  }

  public toProtocolTransaction(): ProtocolTransaction {
    return new ProtocolTransaction({
      methodId: this.methodId,
      nonce: this.nonce,
      argsHash: Poseidon.hash(this.argsFields),
      sender: this.sender,
      signature: this.signature,
    });
  }
}
