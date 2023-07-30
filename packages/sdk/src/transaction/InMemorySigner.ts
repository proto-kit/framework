/* eslint-disable import/no-unused-modules */
import { Field, PrivateKey, Signature } from "snarkyjs";
import { AppChainModule } from "../appChain/AppChainModule";

export interface Signer extends AppChainModule<unknown> {
  sign: (signatureData: Field[]) => Promise<Signature>;
}

export interface InMemorySignerConfig {
  signer: PrivateKey;
}

export class InMemorySigner
  extends AppChainModule<InMemorySignerConfig>
  implements Signer
{
  public constructor(public signer: PrivateKey) {
    super();
  }

  public async sign(signatureData: Field[]): Promise<Signature> {
    return Signature.create(this.config.signer, signatureData);
  }
}
