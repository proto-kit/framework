import {
  Bool,
  Field,
  Poseidon,
  type PrivateKey,
  PublicKey,
  Signature,
  UInt64,
} from "o1js";
import {
  PublicKeyOption,
  RuntimeTransaction,
  SignedTransaction,
  UInt64Option,
} from "@proto-kit/protocol";

export type UnsignedTransactionBody = {
  methodId: Field;
  nonce: UInt64;
  sender: PublicKey;
  argsFields: Field[];
  /**
   * Used to transport non-provable data, mainly proof data for now
   * These values will not be part of the signature message or transaction hash
   */
  auxiliaryData: string[];
  isMessage: boolean;
};

export class UnsignedTransaction implements UnsignedTransactionBody {
  public methodId: Field;

  public nonce: UInt64;

  public sender: PublicKey;

  public argsFields: Field[];

  public auxiliaryData: string[];

  public isMessage: boolean;

  public constructor(data: {
    methodId: Field;
    nonce: UInt64;
    sender: PublicKey;
    argsFields: Field[];
    auxiliaryData: string[];
    isMessage: boolean;
  }) {
    this.methodId = data.methodId;
    this.nonce = data.nonce;
    this.sender = data.sender;
    this.argsFields = data.argsFields;
    this.auxiliaryData = data.auxiliaryData;
    this.isMessage = data.isMessage;
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
    return SignedTransaction.getSignatureData({
      nonce: this.nonce,
      methodId: this.methodId,
      argsHash: this.argsHash(),
    });
  }

  public sign(privateKey: PrivateKey): PendingTransaction {
    const signature = Signature.create(privateKey, this.getSignatureData());
    return this.signed(signature);
  }

  public toRuntimeTransaction(): RuntimeTransaction {
    const isSome = Bool(!this.isMessage);
    return new RuntimeTransaction({
      methodId: this.methodId,
      argsHash: Poseidon.hash(this.argsFields),
      nonce: new UInt64Option({ value: this.nonce, isSome }),
      sender: new PublicKeyOption({ value: this.sender, isSome }),
    });
  }

  public signed(signature: Signature): PendingTransaction {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new PendingTransaction({
      methodId: this.methodId,
      sender: this.sender,
      nonce: this.nonce,
      signature,
      argsFields: this.argsFields,
      auxiliaryData: this.auxiliaryData,
      isMessage: this.isMessage,
    });
  }
}

interface PendingTransactionJSONType {
  hash: string;
  methodId: string;
  nonce: string;
  sender: string;
  argsFields: string[];
  auxiliaryData: string[];
  signature: {
    r: string;
    s: string;
  };
  isMessage: boolean;
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
      auxiliaryData: object.auxiliaryData.slice(),
      isMessage: object.isMessage,
    });
  }

  public signature: Signature;

  public constructor(data: {
    methodId: Field;
    nonce: UInt64;
    sender: PublicKey;
    signature: Signature;
    argsFields: Field[];
    auxiliaryData: string[];
    isMessage: boolean;
  }) {
    super(data);
    this.signature = data.signature;
  }

  public toJSON(): PendingTransactionJSONType {
    return {
      hash: this.hash().toString(),
      methodId: this.methodId.toJSON(),
      nonce: this.nonce.toString(),
      sender: this.sender.toBase58(),
      argsFields: this.argsFields.map((x) => x.toJSON()),
      auxiliaryData: this.auxiliaryData.slice(),
      isMessage: this.isMessage,

      signature: {
        r: this.signature.r.toJSON(),

        s: this.signature.s.toJSON(),
      },
    };
  }

  public toProtocolTransaction(): SignedTransaction {
    return new SignedTransaction({
      transaction: this.toRuntimeTransaction(),
      signature: this.signature,
    });
  }
}
