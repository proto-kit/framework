import { Field, PrivateKey, Signature } from "o1js";
import { injectable } from "tsyringe";

import { AppChainModule } from "../appChain/AppChainModule";

export interface Signer {
  sign: (signatureData: Field[]) => Promise<Signature>;
}

export interface InMemorySignerConfig {
  signer: PrivateKey;
}

@injectable()
export class InMemorySigner
  extends AppChainModule<InMemorySignerConfig>
  implements Signer
{
  public constructor() {
    super();
  }

  public async sign(signatureData: Field[]): Promise<Signature> {
    return Signature.create(this.config.signer, signatureData);
  }
}
