import {
  Bool,
  fetchAccount,
  Field,
  PrivateKey,
  PublicKey,
  Signature,
  Transaction,
  UInt32,
} from "o1js";
import { AreProofsEnabled, mapSequential } from "@proto-kit/common";

import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";
import { MinaSigner } from "../MinaSigner";

interface SignTransactionOptions {
  signingWithSignatureCheck?: PublicKey[];
  signingPublicKeys?: PublicKey[];
  additionalKeys?: PrivateKey[];
  preventNoncePreconditionFor?: PublicKey[];
  signWithContract?: boolean;
}

/**
 * Utils class that provides methods for sending transactions that are signed-settlement-enabled
 */
export class SettlementUtils {
  public constructor(
    private readonly areProofsEnabled: AreProofsEnabled,
    private readonly baseLayer: MinaBaseLayer,
    private readonly signer: MinaSigner
  ) {}

  /**
   * Signed settlement happens when proofs are disabled and the network is remote
   * This is because on local network we can use mock proofs, while on remotes ones we can't
   */
  public isSignedSettlement(): boolean {
    return (
      !this.areProofsEnabled.areProofsEnabled &&
      !this.baseLayer.isLocalBlockChain()
    );
  }

  public getSigner(): PublicKey {
    return this.signer.getSignerAddress();
  }

  public sign(signatureData: Field[]): Signature {
    return this.signer.sign(signatureData);
  }

  public signMessageWithContract(signatureData: Field[]): Signature {
    return this.signer.signMessageWithContract(signatureData);
  }

  public getContractAddresses(): PublicKey[] {
    const keys = this.signer.getContractAddresses();
    return [keys[0], keys[1], keys[2]];
  }

  public signTransaction(
    tx: Transaction<false, false>,
    options: SignTransactionOptions = {}
  ) {
    const {
      signingWithSignatureCheck = [],
      signingPublicKeys = [],
      additionalKeys = [],
      preventNoncePreconditionFor = [],
      signWithContract = false,
    } = options;

    const contractKeyArray = this.isSignedSettlement()
      ? signingWithSignatureCheck
      : [];

    if (signWithContract) {
      this.requireSignatureIfNecessary(
        tx,
        this.getContractAddresses().concat(contractKeyArray),
        preventNoncePreconditionFor
      );
    } else {
      this.requireSignatureIfNecessary(
        tx,
        contractKeyArray,
        preventNoncePreconditionFor
      );
    }

    const pubKeys = signingWithSignatureCheck.concat(signingPublicKeys);

    return this.signer.signTx(tx, {
      pubKeys,
      additionalKeys,
      signWithContract,
    });
  }

  private requireSignatureIfNecessary(
    tx: Transaction<false, false>,
    addresses: PublicKey[],
    preventNoncePreconditionFor: PublicKey[]
  ) {
    if (this.isSignedSettlement() && addresses !== undefined) {
      const nonces: Record<string, number> = {};

      tx.transaction.accountUpdates.forEach((au) => {
        if (
          addresses.find((address) =>
            au.publicKey.equals(address).toBoolean()
          ) !== undefined
        ) {
          if (
            preventNoncePreconditionFor.find((pk) =>
              pk.equals(au.publicKey).toBoolean()
            ) !== undefined
          ) {
            // au.body.incrementNonce = Bool(false);
            // au.body.preconditions.account.nonce.isSome = Bool(false);
            au.body.authorizationKind.isSigned = Bool(false);
            au.body.authorizationKind.isProved = Bool(false);
            au.body.authorizationKind.verificationKeyHash = Field(
              "3392518251768960475377392625298437850623664973002200885669375116181514017494"
            );
            au.authorization = {};
            au.lazyAuthorization = { kind: "lazy-none" };
          } else {
            au.requireSignature();

            const key = `${au.publicKey.toBase58()}-${au.tokenId.toString()}`;
            const nonce = Number(
              au.body.preconditions.account.nonce.value.lower.toString()
            );
            if (nonces[key] === undefined) {
              nonces[key] = nonce;
            } else {
              const next = nonces[key] + 1;
              au.body.preconditions.account.nonce.value = {
                lower: UInt32.from(next),
                upper: UInt32.from(next),
              };
              nonces[key] = next;
            }
          }
        }
      });
    }
  }

  /**
   * Fetch a set of accounts (and there update internally) with respect to what network is set
   */
  public async fetchContractAccounts(
    ...accounts: { address: PublicKey; tokenId?: Field }[]
  ) {
    if (this.baseLayer.config.network.type !== "local") {
      await mapSequential(accounts, async (account) => {
        await fetchAccount({
          publicKey: account.address,
          tokenId: account.tokenId,
        });
      });
    }
  }
}
