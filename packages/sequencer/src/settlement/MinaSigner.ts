import { Field, PrivateKey, PublicKey, Signature, Transaction } from "o1js";
import { noop } from "@proto-kit/common";
import { injectable } from "tsyringe";

export interface SignTxOptions {
  pubKeys?: PublicKey[];
  additionalKeys?: PrivateKey[];
  signWithContract?: boolean;
}

import { SequencerModule } from "../sequencer/builder/SequencerModule";
export interface MinaSigner {
  getSignerAddress(): PublicKey;

  getContractAddresses(): PublicKey[];

  sign(signatureData: Field[]): Signature;
  signMessageWithContract(signatureData: Field[]): Signature,

  signTx(
    tx: Transaction<false, false>,
    options?: SignTxOptions
  ): Transaction<false, true>;

}

export interface InMemorySignerConfig {
  signer: PrivateKey;
  contractKeys: PrivateKey[]; 
  tokenControllers?: PrivateKey[]; 
  tokenBridgeKeys?: PrivateKey[];
}

@injectable()
export class InMemoryMinaSigner
  extends SequencerModule<InMemorySignerConfig>
  implements MinaSigner
{

  private _keyMap!: Map<string, PrivateKey>;
  
  public constructor() {
    super();
  }

  private initializeKeyMap(): void {
    if (this._keyMap) return; 
    
    this._keyMap = new Map();

    this.config.tokenBridgeKeys?.forEach(key => {
      this._keyMap.set(key.toPublicKey().toBase58(), key);
    });

    this.config.contractKeys.forEach(key => {
      this._keyMap.set(key.toPublicKey().toBase58(), key);
    });

    this.config.tokenControllers?.forEach(key => {
      this._keyMap.set(key.toPublicKey().toBase58(), key);
    });
  }

  public getSignerAddress(): PublicKey{
    return this.config.signer.toPublicKey();
  }
  
  /**
   * Contracts public key getter. Since we expect private keys to be managed here, public keys can be returned from this module.
   * With index order, returned public keys are public keys of: 
   * [0] -> settlement contract
   * [1] -> dispatch contract
   * [2] -> minaBridge contract
   * 
   * @returns Array of public keys. 
   */
  public getContractAddresses(): PublicKey[] {
    if(!this.config.contractKeys){
      return [];
    }
    
    const contractPrivateKeys = this.config.contractKeys;
    
    return contractPrivateKeys.map((key) => key.toPublicKey());
  }

  /**
   * @param signatureData Data to be signed.
   * @returns Signature signed by signer.
   */
  public sign(signatureData: Field[]): Signature {
    return Signature.create(this.config.signer, signatureData);
  }

    /**
   * @param signatureData Data to be signed.
   * @returns Signature signed with private key of settlement contract address.
   */
  public signMessageWithContract(signatureData: Field[]): Signature{
    return Signature.create(this.config.contractKeys[0],signatureData);
  }

  public signTx(
  tx: Transaction<false, false>,
  options: SignTxOptions = {}
): Transaction<false, true> {
  const { 
    pubKeys = [], 
    additionalKeys = [], 
    signWithContract = false 
  } = options;

  const privateKeys: PrivateKey[] = [];

  for (const pubKey of pubKeys) {
    const privKey = this._keyMap.get(pubKey.toBase58());
    if (!privKey) {
      throw new Error(`Error in signTx function: relevant private key to ${pubKey.toBase58()} not found!`);
    }
    privateKeys.push(privKey);
  }
  
  if (signWithContract) {
    privateKeys.push(...this.config.contractKeys);
  }
  
  const keys = [this.config.signer, ...privateKeys, ...additionalKeys];
  return tx.sign(keys);
}

  public async start() {
    this.initializeKeyMap();
    noop();
  }
}
