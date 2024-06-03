import merge from "lodash/merge";
import { Field, PrivateKey, PublicKey, Signature } from "o1js";
import { injectable } from "tsyringe";

import { AppChainModule } from "../appChain/AppChainModule";

export interface Signer {
  sign: (publicKey: PublicKey, signatureData: Field[]) => Promise<Signature | undefined>;
}

export interface InMemorySignerConfig {
  signers: PrivateKey[];
}

@injectable()
export class InMemorySigner
  extends AppChainModule<InMemorySignerConfig>
  implements Signer
{
  private additionalKeys: Record<string, PrivateKey> = { };

  // We cache the keys coming in from the config, so we don't compute base58
  // for all keys every signature again, since that is quite expensive
  private cachedConfigKeys: Record<string, PrivateKey> | undefined = undefined;

  public constructor() {
    super();
  }

  private getKey(publicKey: PublicKey): PrivateKey | undefined {
    if(this.cachedConfigKeys === undefined){
      this.cachedConfigKeys = this.config.signers.reduce<Record<string, PrivateKey>>((acc, pk) => {
        acc[pk.toPublicKey().toBase58()] = pk;
        return acc;
      }, {})
    }
    const allKeys = merge({}, this.cachedConfigKeys, this.additionalKeys);
    return allKeys[publicKey.toBase58()];
  }

  public async sign(
    publicKey: PublicKey,
    signatureData: Field[],
  ): Promise<Signature | undefined> {
    const key = this.getKey(publicKey);
    if(key !== undefined){
      return Signature.create(key, signatureData);
    }
    return undefined;
  }

  public addSigner(key: PrivateKey) {
    this.additionalKeys[key.toPublicKey().toBase58()] = key;
  }
}
