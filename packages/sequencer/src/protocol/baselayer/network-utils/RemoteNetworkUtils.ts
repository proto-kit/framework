import { injectable } from "tsyringe";
import { PrivateKey, PublicKey } from "o1js";
import { noop } from "@proto-kit/common";

import { MinaNetworkUtils } from "./MinaNetworkUtils";

@injectable()
export class RemoteNetworkUtils implements MinaNetworkUtils {
  public async waitForNetwork(): Promise<void> {
    noop();
  }

  public async getFundedAccounts(
    num?: number | undefined
  ): Promise<PrivateKey[]> {
    throw new Error("Method not implemented.");
  }

  public async faucet(
    receiver: PublicKey,
    fundingAmount?: number | undefined,
    fee?: number | undefined
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
