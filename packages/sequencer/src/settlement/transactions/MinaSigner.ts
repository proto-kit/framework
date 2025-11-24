import { Field, Signature, Transaction, PublicKey } from "o1js";

export interface MinaSigner {
  getContractKeys(): PublicKey[];
  
  sign(signatureData: Field[]): Signature;
  
  signTransaction(
    tx: Transaction<any, false>
  ): Transaction<any, true>;
}