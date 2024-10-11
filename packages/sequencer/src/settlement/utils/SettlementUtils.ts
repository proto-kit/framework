import {
  fetchAccount,
  Field,
  PrivateKey,
  PublicKey,
  Transaction,
  UInt32,
} from "o1js";
import { AreProofsEnabled, mapSequential } from "@proto-kit/common";

import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";

/**
 * Utils class that provides methods for sending transactions that are signed-settlement-enabled
 */
export class SettlementUtils {
  public constructor(
    private readonly areProofsEnabled: AreProofsEnabled,
    private readonly baseLayer: MinaBaseLayer
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

  /**
   * Sign transaction with two variants:
   *
   * - If it normal settlement (proofs enabled or mock proofs):
   *   Sign the transaction normally
   *
   * - If it is signed settlement:
   *   Signed the transactions and make all contract AUs where a private key is known
   *   via the contractKeys param require a signature and sign them using that key
   */
  public signTransaction(
    tx: Transaction<false, false>,
    pks: PrivateKey[],
    contractKeys: PrivateKey[]
  ): Transaction<false, true> {
    const contractKeyArray = this.isSignedSettlement() ? contractKeys : [];
    this.requireSignatureIfNecessary(
      tx,
      contractKeyArray.map((key) => key.toPublicKey())
    );
    return tx.sign([...pks, ...contractKeyArray]);
  }

  private requireSignatureIfNecessary(
    tx: Transaction<false, false>,
    addresses: PublicKey[]
  ) {
    if (this.isSignedSettlement() && addresses !== undefined) {
      const nonces: Record<string, number> = {};

      tx.transaction.accountUpdates.forEach((au) => {
        if (
          addresses.find((address) =>
            au.publicKey.equals(address).toBoolean()
          ) !== undefined
        ) {
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
