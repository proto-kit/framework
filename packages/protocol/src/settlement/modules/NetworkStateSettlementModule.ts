import { UInt64 } from "o1js";

import {
  ProvableSettlementHook,
  SettlementHookInputs,
} from "../ProvableSettlementHook";
import { SettlementContract } from "../SettlementContract";

type NetworkStateSettlementModuleConfig = {
  blocksPerL1Block: UInt64;
};

export class NetworkStateSettlementModule extends ProvableSettlementHook<NetworkStateSettlementModuleConfig> {
  public beforeSettlement(
    smartContract: SettlementContract,
    {
      blockProof,
      fromNetworkState,
      toNetworkState,
      contractState,
      currentL1Block,
    }: SettlementHookInputs
  ): void {
    const { lastSettlementL1Block } = contractState;

    const blocksPerL1Block = this.config.blocksPerL1Block.toConstant();

    // const precision = 100000n;
    // const betweenRatio = Field(9n * precision / 10n);
    // const precisionField = Field(precision);

    const numL1Blocks = currentL1Block.sub(lastSettlementL1Block);
    const expectedHeightDiff = numL1Blocks.toUInt64().mul(blocksPerL1Block);

    const actualHeightDiff = toNetworkState.block.height.sub(
      fromNetworkState.block.height
    );

    const acceptableDerivation = numL1Blocks.mul(1).div(10);

    // TODO Check within bounds efficiently
  }
}
