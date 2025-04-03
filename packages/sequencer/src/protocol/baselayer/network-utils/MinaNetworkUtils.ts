import { PrivateKey, PublicKey } from "o1js";

export interface MinaNetworkUtils {
  getFundedAccounts(num?: number): Promise<PrivateKey[]>;

  faucet(
    receiver: PublicKey,
    fundingAmount?: number,
    // TODO Should we use the FeeStrategy here?
    fee?: number
  ): Promise<void>;

  waitForNetwork(): Promise<void>;
}
