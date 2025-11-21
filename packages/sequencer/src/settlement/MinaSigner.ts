import { Field, PrivateKey, PublicKey, Signature, Transaction } from "o1js";
import { injectable } from "tsyringe";
import { AppChainModule } from "../appChain/AppChainModule";

export interface MinaSigner {
  getContractKeys(): PublicKey[];
  
  sign(signatureData: Field[]): Promise<Signature>;
  
  signTransaction(  
    tx: Transaction<false, false>
  ): Promise<Transaction<false, true>>;
}

export interface InMemorySignerConfig {
  signer: PrivateKey;         
  contractKeys?: {
    settlementKey: PrivateKey,
    dispatchKey: PrivateKey,
    minaBridgeKey: PrivateKey,
  }
  // optional way: 
  // additionalKeys?: PrivateKey[]
}

@injectable()
export class SettlementSigner
  extends AppChainModule<InMemorySignerConfig> 
  implements MinaSigner
{
  public constructor() {
    super();
  }

  /**
   * 
   * Contracts public key getter. Since we expect private keys to be managed here, public keys can be returned from this module.
   * 
   * @returns Array of public keys, not ordered yet
   * 
   */
  public getContractKeys(): PublicKey[] {
    const contractKeysObject = this.config.contractKeys ?? {};
    
    // Use Object.values to get the PrivateKey objects and filter out any undefined values.
    const contractPrivateKeys: PrivateKey[] = Object.values(contractKeysObject).filter(
      (key): key is PrivateKey => key !== undefined
    );
    
    return contractPrivateKeys.map(key => key.toPublicKey());
  }

  /**
   * @param signatureData Data to be signed.
   * @returns Signature signed by signer.
   */
  public async sign(signatureData: Field[]): Promise<Signature> {
    return Signature.create(this.config.signer, signatureData);
  }


  /**
   * 
   * Signs the transaction with all available keys (will/should be change and signing must be done in a selective way).
   * 
   * @param tx Transaction to be signed with.
   * @returns signed transaction object
   */
  public async signTransaction(
    tx: Transaction<false, false>
  ): Promise<Transaction<false, true>> {
    const contractKeysObject = this.config.contractKeys ?? {};
    
    // Extract the PrivateKey objects from the configuration object
    const contractPrivateKeys: PrivateKey[] = Object.values(contractKeysObject).filter(
      (key): key is PrivateKey => key !== undefined
    );

    // Combine the primary signer (feepayer) with the contract keys
    const allKeys: PrivateKey[] = [
      this.config.signer,
      ...contractPrivateKeys
    ];

    // Sign the transaction with the collected keys
    return tx.sign(allKeys);
  }

}