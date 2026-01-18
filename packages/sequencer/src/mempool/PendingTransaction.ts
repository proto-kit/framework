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
import { FieldString } from "@proto-kit/common";

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
  public readonly methodId: Field;

  public readonly nonce: UInt64;

  public readonly sender: PublicKey;

  public readonly argsFields: Field[];

  public readonly auxiliaryData: string[];

  public readonly isMessage: boolean;

  public constructor(
    data: {
      methodId: Field;
      nonce: UInt64;
      sender: PublicKey;
      argsFields: Field[];
      auxiliaryData: string[];
      isMessage: boolean;
    },
    memoizedHash?: Field
  ) {
    this.methodId = data.methodId;
    this.nonce = data.nonce;
    this.sender = data.sender;
    this.argsFields = data.argsFields;
    this.auxiliaryData = data.auxiliaryData;
    this.isMessage = data.isMessage;

    if (memoizedHash !== undefined) {
      this.memoizedHash = memoizedHash;
    }
  }

  public argsHash(): Field {
    return Poseidon.hash(this.argsFields);
  }

  private memoizedHash?: Field = undefined;

  public hash(): Field {
    if (this.memoizedHash === undefined) {
      this.memoizedHash = Poseidon.hash([
        this.methodId,
        ...this.sender.toFields(),
        ...this.nonce.toFields(),
        this.argsHash(),
      ]);
    }
    return this.memoizedHash;
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
    return new PendingTransaction({
      hash: this.hash().toString(),
      methodId: this.methodId.toString(),
      sender: this.sender.toBase58(),
      nonce: this.nonce.toString(),
      signature: { r: signature.r.toJSON(), s: signature.s.toJSON() },
      argsFields: this.argsFields.map((f) => f.toString()),
      auxiliaryData: this.auxiliaryData,
      isMessage: this.isMessage,
    });
}
}

export interface PendingTransactionJSONType {
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

export class PendingTransaction {
  public static fromJSON(
    object: PendingTransactionJSONType
  ): PendingTransaction {
    return new PendingTransaction({
      hash: object.hash,
      methodId: object.methodId,
      nonce: object.nonce,
      sender: object.sender,
      argsFields: object.argsFields.slice(),
      auxiliaryData: object.auxiliaryData.slice(),
      signature: { r: object.signature.r, s: object.signature.s },
      isMessage: object.isMessage,
    });
  }

  public constructor(
    public data: {
      hash: FieldString;
      methodId: FieldString;
      nonce: string;
      sender: string;
      argsFields: FieldString[];
      auxiliaryData: string[];
      signature: { r: string; s: string };
      isMessage: boolean;
    }
  ) {}

  public toJSON(): PendingTransactionJSONType {
    return {
      hash: this.data.hash,
      methodId: this.data.methodId,
      nonce: this.data.nonce,
      sender: this.data.sender,
      argsFields: this.data.argsFields.slice(),
      auxiliaryData: this.data.auxiliaryData.slice(),
      signature: { r: this.data.signature.r, s: this.data.signature.s },
      isMessage: this.data.isMessage,
    };
  }

  public toRuntimeTransaction(): RuntimeTransaction {
    const isSome = Bool(!this.data.isMessage);
    return new RuntimeTransaction({
      methodId: Field(this.data.methodId),
      argsHash: Poseidon.hash(this.data.argsFields.map((f) => Field(f))),
      nonce: new UInt64Option({ value: UInt64.from(this.data.nonce), isSome }),
      sender: new PublicKeyOption({ value: PublicKey.fromBase58(this.data.sender), isSome }),
    });
  }

  public toProtocolTransaction(): SignedTransaction {
    return new SignedTransaction({
      transaction: this.toRuntimeTransaction(),
      signature: Signature.fromJSON(this.data.signature),
    });
  }
}