import { Field, PrivateKey, PublicKey, Signature, Transaction } from "o1js";

import {
  sequencerModule,
  SequencerModule,
} from "../sequencer/builder/SequencerModule";

/**
 * Options for signing transactions.
 */
export interface SignTxOptions {
  /**
   * Optional array of public keys whose corresponding private keys
   * should be used to sign the transaction in addition to the feepayer key.
   */
  pubKeys?: PublicKey[];
}

/**
 * Interface for signing Mina blockchain transactions and managing cryptographic keys.
 * Provides methods for signing transactions, managing contract addresses, and handling
 * cryptographic signatures for the Mina protocol.
 */
export interface MinaSigner {
  /**
   * Retrieves the public key of the feepayer account.
   * The feepayer is the account that pays
   * transaction fees on the Mina blockchain.
   *
   * @returns The {@link PublicKey} of the feepayer account.
   */
  getFeepayerKey(): PublicKey;

  /**
   * Retrieves the public keys of all managed smart contract addresses.
   * These typically include settlement, dispatch, and bridge contract addresses.
   *
   * @returns Array of {@link PublicKey}s for the managed contracts.
   */
  getContractAddresses(): PublicKey[];

  /**
   * Signs arbitrary data using the feepayer's private key.
   *
   * @param signatureData - Array of {@link Field} elements representing the data to be signed.
   * @returns A cryptographic {@link Signature} over the provided data.
   */
  sign(signatureData: Field[]): Signature;

  /**
   * Signs arbitrary data using a specific registered private key.
   *
   * @param publicKey - The {@link PublicKey} whose corresponding private key
   *                                          will be used for signing.
   * @param signatureData - Array of {@link Field} elements representing the data to be signed.
   * @returns A cryptographic {@link Signature} over the provided data.
   * @throws An {@link Error} If the corresponding private key is not found in the key registry.
   */
  signWithKey(publicKey: PublicKey, signatureData: Field[]): Signature;

  /**
   * Signs a Mina transaction with the feepayer key and optionally additional keys.
   *
   * @param tx - The unsigned {@link Transaction} to be signed.
   * @param options - Optional {@link SignTxOptions} specifying additional keys to use for signing.
   * @returns The signed {@link Transaction<false, true>} ready for submission to the network.
   * @throws An {@link Error} If any required private key is not found.
   */
  signTx(
    tx: Transaction<false, false>,
    options?: SignTxOptions
  ): Transaction<false, true>;

  /**
   * Registers a new private key in the signer's key management system.
   *
   * @param privateKey - The {@link PrivateKey} to register.
   * @returns {PublicKey} The corresponding public key of the registered private key.
   */
  registerKey(privateKey: PrivateKey): PublicKey;

  /**
   * Retrieves the public keys of all managed token bridge addresses.
   * Token bridges facilitate cross-chain token transfers.
   *
   * @returns {PublicKey[]} Array of public keys for token bridge contracts,
   *                        or empty array if none configured.
   */
  getTokenAddresses(): PublicKey[];
}

/**
 * Configuration for the in-memory Mina signer.
 * Defines all private keys that the signer will manage.
 */
export interface InMemorySignerConfig {
  /**
   * Private key of the feepayer account that will pay for transaction fees.
   */
  feepayer: PrivateKey;

  /**
   * Private keys for smart contracts managed by this signer.
   * Expected order: [settlement, dispatch, minaBridge]
   */
  contractKeys: PrivateKey[];

  /**
   * Optional private keys for token bridge contracts.
   * Used when the application manages cross-chain token transfers.
   */
  tokenBridgeKeys?: PrivateKey[];
}

/**
 * In-memory implementation of the MinaSigner interface.
 * Stores private keys in memory and provides cryptographic signing operations
 * for the Mina blockchain protocol. This implementation is suitable for
 * server-side sequencer operations where keys can be securely stored in memory.
 */
@sequencerModule()
export class InMemoryMinaSigner
  extends SequencerModule<InMemorySignerConfig>
  implements MinaSigner
{
  /**
   * Internal map storing the relationship between public keys (in base58 format)
   * and their corresponding private keys for efficient lookup during signing operations.
   */
  private keyMap!: Map<string, PrivateKey>;

  public constructor() {
    super();
  }

  /**
   * Initializes the internal key mapping from configured private keys.
   * Populates the keyMap with both token bridge keys and contract keys,
   * using base58-encoded public keys as lookup identifiers.
   *
   * @private
   */
  private initializeKeyMap(): void {
    this.keyMap = new Map();

    // Register token bridge keys if configured
    this.config.tokenBridgeKeys?.forEach((key) => {
      this.keyMap.set(key.toPublicKey().toBase58(), key);
    });

    // Register contract keys
    this.config.contractKeys.forEach((key) => {
      this.keyMap.set(key.toPublicKey().toBase58(), key);
    });
  }

  /**
   * Retrieves the public key of the feepayer account.
   * The feepayer is responsible for paying transaction fees on the Mina blockchain.
   *
   * @returns {PublicKey} The public key derived from the configured feepayer private key.
   */
  public getFeepayerKey(): PublicKey {
    return this.config.feepayer.toPublicKey();
  }

  /**
   * Retrieves all configured token bridge public keys.
   *
   * {@link PublicKey[]} Array of public keys for all configured token bridge contracts.
   *          Returns empty array if no token bridge keys are configured.
   */
  public getTokenAddresses(): PublicKey[] {
    if (this.config.tokenBridgeKeys) {
      return this.config.tokenBridgeKeys.map((x) => x.toPublicKey());
    }
    return [];
  }

  /**
   * Retrieves public keys for all managed smart contracts.
   *
   * **Expected key order**:
   * - Index 0: Settlement contract public key
   * - Index 1: Dispatch contract public key
   * - Index 2: Mina bridge contract public key
   *
   * The order corresponds to the order of private keys in the configuration.
   *
   * @returnsArray of  {@link PublicKey}s  derived from configured contract private keys.
   */
  public getContractAddresses(): PublicKey[] {
    const contractPrivateKeys = this.config.contractKeys;
    return contractPrivateKeys.map((key) => key.toPublicKey());
  }

  /**
   * Signs arbitrary data using the feepayer's private key.
   * This is useful for creating signatures or signing
   * custom protocol messages.
   *
   * @param signatureData - Array of {@link Field} elements to be signed.
   *                        Field is the base type for Mina's cryptographic operations.
   * @returns Cryptographic {@link Signature} created using the feepayer's private key.
   *
   * @example
   * ```typescript
   * const message = [Field(123), Field(456)];
   * const signature = signer.sign(message);
   * ```
   */
  public sign(signatureData: Field[]): Signature {
    return Signature.create(this.config.feepayer, signatureData);
  }

  /**
   * Signs arbitrary data using a specific registered private key.
   * Enables signing with contract or bridge keys rather than the feepayer key.
   *
   * @param publicKey - The {@link PublicKey} identifying which private key to use for signing.
   *                    This public key must have been previously registered in the keyMap.
   * @param signatureData - Array of {@link Field} elements representing the data to be signed.
   * @returns Cryptographic {@link Signature}  created with the specified private key.
   * @throws An {@link Error} if no private key is found for the provided public key.
   *
   * @example
   * ```typescript
   * const contractPubKey = signer.getContractAddresses()[0];
   * const message = [Field(789)];
   * const signature = signer.signWithKey(contractPubKey, message);
   * ```
   */
  public signWithKey(publicKey: PublicKey, signatureData: Field[]): Signature {
    const key = this.keyMap.get(publicKey.toBase58());
    if (!key) {
      throw new Error(`Relevant key not found for ${publicKey.toBase58()}`);
    }
    return Signature.create(key, signatureData);
  }

  /**
   * Registers a new private key in the signer's key management system.
   * If the key already exists, returns the existing public key without modification.
   * This method is idempotent - calling it multiple times with the same key is safe.
   *
   * @param privateKey - The {@link PrivateKey} to register for future signing operations.
   * @returns {PublicKey} The public key corresponding to the registered private key.
   *
   * @example
   * ```typescript
   * const newKey = PrivateKey.random();
   * const publicKey = signer.registerKey(newKey);
   * // Now this key can be used for signing operations.
   * ```
   */
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

  /**
   * Signs a Mina transaction with multiple private keys.
   * Always signs with the feepayer key, optionally with additional
   * keys specified in the options. This is required for transactions that
   * need authorization from multiple parties (e.g., contract deployments in
   * our case)
   *
   * @param tx - The unsigned {@link Transaction< false, false>} object to be signed.
   *             Must be of type Transaction<false, false> (unsigned).
   * @param options - Optional {@link SignTxOptions} configuration containing:
   *                  - pubKeys: Array of public keys whose
   *                             private keys should sign the transaction.
   *                             Each public key must be registered in the keyMap.
   * @returns The signed {@link Transaction<false, true>} ready for network submission.
   * @throws An {@link Error} If any required private key is not found in the key registry.
   *
   * @example
   * ```typescript
   * const unsignedTx = await Mina.transaction(sender, () => {
   *   // transaction logic
   * });
   *
   * // Sign with feepayer only
   * const signedTx1 = signer.signTx(unsignedTx);
   *
   * // Sign with feepayer and additional keys
   * const contractKeys = signer.getContractAddresses();
   * const signedTx2 = signer.signTx(unsignedTx, {
   *   pubKeys: [contractKeys[0], contractKeys[1]]
   * });
   * ```
   */
  public signTx(
    tx: Transaction<false, false>,
    options: SignTxOptions = {}
  ): Transaction<false, true> {
    const { pubKeys = [] } = options;
    const privateKeys: PrivateKey[] = [];

    // Gather all required private keys from the keyMap
    for (const pubKey of pubKeys) {
      const privKey = this.keyMap.get(pubKey.toBase58());
      if (!privKey) {
        throw new Error(
          `Error in signTx function: relevant private key to ${pubKey.toBase58()} not found!`
        );
      }
      privateKeys.push(privKey);
    }

    // Sign with feepayer first, then additional keys
    const keys = [this.config.feepayer, ...privateKeys];
    return tx.sign(keys);
  }

  /**
   * Lifecycle method called when the signer module starts.
   * Initializes the internal key mapping from the configured private keys.
   * This method is part of the SequencerModule lifecycle and is automatically
   * called by the framework during sequencer startup.
   *
   * @async
   */
  public async start() {
    this.initializeKeyMap();
  }
}
