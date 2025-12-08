import { Field, PrivateKey, PublicKey, Signature, Transaction } from "o1js";
import { noop } from "@proto-kit/common";
import { injectable } from "tsyringe";

import { SequencerModule } from "../sequencer/builder/SequencerModule";

export interface SignTxOptions {
  pubKeys?: PublicKey[];
}
export interface MinaSigner {
  getFeepayerKey(): PublicKey;

  getContractAddresses(): PublicKey[];

  sign(signatureData: Field[]): Signature;

  signWithKey(publicKey: PublicKey, signatureData: Field[]): Signature;

  signTx(
    tx: Transaction<false, false>,
    options?: SignTxOptions
  ): Transaction<false, true>;

  registerKey(privateKey: PrivateKey): PublicKey;
}

export interface InMemorySignerConfig {
  feepayer: PrivateKey;
  contractKeys: PrivateKey[];
  tokenControllers?: PrivateKey[];
  tokenBridgeKeys?: PrivateKey[];
}

@injectable()
export class InMemoryMinaSigner
  extends SequencerModule<InMemorySignerConfig>
  implements MinaSigner
{
  private keyMap!: Map<string, PrivateKey>;

  public constructor() {
    super();
  }

  private initializeKeyMap(): void {
    this.keyMap = new Map();

    this.config.tokenBridgeKeys?.forEach((key) => {
      this.keyMap.set(key.toPublicKey().toBase58(), key);
    });

    this.config.contractKeys.forEach((key) => {
      this.keyMap.set(key.toPublicKey().toBase58(), key);
    });

    this.config.tokenControllers?.forEach((key) => {
      this.keyMap.set(key.toPublicKey().toBase58(), key);
    });
  }

  public getFeepayerKey(): PublicKey {
    return this.config.feepayer.toPublicKey();
  }

  /**
   * Contracts public key getter. Since we expect private keys to be managed here,
   * public keys can be returned from this module.
   * With index order, returned public keys are public keys of:
   * [0] -> settlement contract
   * [1] -> dispatch contract
   * [2] -> minaBridge contract
   *
   * @returns Array of public keys.
   */
  public getContractAddresses(): PublicKey[] {
    const contractPrivateKeys = this.config.contractKeys;

    return contractPrivateKeys.map((key) => key.toPublicKey());
  }

  /**
   * @param signatureData Data to be signed.
   * @returns Signature signed by signer.
   */
  public sign(signatureData: Field[]): Signature {
    return Signature.create(this.config.feepayer, signatureData);
  }

  /**
   * @param signatureData Data to be signed.
   * @returns Signature signed with private key of settlement contract address.
   */
  public signWithKey(publicKey: PublicKey, signatureData: Field[]): Signature {
    const key = this.keyMap.get(publicKey.toBase58());
    if (!key) {
      throw new Error(`Relevant key not found for ${publicKey}`);
    }
    return Signature.create(key, signatureData);
  }

  public registerKey(privateKey: PrivateKey): PublicKey {
    const publicKey = privateKey.toPublicKey();
    const publicKeyString = publicKey.toBase58();

    const keyExist = this.keyMap.get(publicKeyString);

    if (keyExist) {
      return publicKey;
    } else {
      this.keyMap.set(publicKeyString, privateKey);
      return publicKey;
    }
  }

  public signTx(
    tx: Transaction<false, false>,
    options: SignTxOptions = {}
  ): Transaction<false, true> {
    const { pubKeys = [] } = options;

    const privateKeys: PrivateKey[] = [];

    for (const pubKey of pubKeys) {
      const privKey = this.keyMap.get(pubKey.toBase58());
      if (!privKey) {
        throw new Error(
          `Error in signTx function: relevant private key to ${pubKey.toBase58()} not found!`
        );
      }
      privateKeys.push(privKey);
    }

    const keys = [this.config.feepayer, ...privateKeys];
    return tx.sign(keys);
  }

  public async start() {
    this.initializeKeyMap();
    noop();
  }
}
