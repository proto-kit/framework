import { injectable } from "tsyringe";

import { ContractModule } from "../ContractModule";

import {
  BridgeContract,
  BridgeContractBase,
  BridgeContractType,
} from "./BridgeContract";

export type BridgeContractConfig = {
  withdrawalStatePath: `${string}.${string}`;
  withdrawalEventName: string;
};

@injectable()
export class BridgeContractProtocolModule extends ContractModule<
  BridgeContractType,
  BridgeContractConfig
> {
  public contractFactory() {
    const { config } = this;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const withdrawalStatePathSplit = config.withdrawalStatePath.split(".") as [
      string,
      string,
    ];

    BridgeContractBase.args = {
      withdrawalStatePath: withdrawalStatePathSplit,
      SettlementContract: undefined,
    };

    return BridgeContract;
  }

  public async compile() {
    const bridgeVK = await BridgeContract.compile();
    return {
      BridgeContract: bridgeVK,
    };
  }
}
