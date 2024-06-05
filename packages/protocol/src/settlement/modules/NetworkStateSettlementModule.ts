import { UInt64 } from "o1js";

import {
  ProvableSettlementHook,
  SettlementHookInputs,
} from "../modularity/ProvableSettlementHook";
import { SettlementSmartContract } from "../contracts/SettlementSmartContract";

type NetworkStateSettlementModuleConfig = {
  blocksPerL1Block: UInt64;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
export class NetworkStateSettlementModule extends ProvableSettlementHook<NetworkStateSettlementModuleConfig> {
  public async beforeSettlement(
    smartContract: SettlementSmartContract,
    {
      blockProof,
      fromNetworkState,
      toNetworkState,
      contractState,
      currentL1Block,
    }: SettlementHookInputs
  ) {
    const { lastSettlementL1Block } = contractState;

    const blocksPerL1Block = this.config.blocksPerL1Block.toConstant();

    const numL1Blocks = currentL1Block.sub(lastSettlementL1Block);
    const expectedHeightDiff = numL1Blocks.toUInt64().mul(blocksPerL1Block);

    const actualHeightDiff = toNetworkState.block.height.sub(
      fromNetworkState.block.height
    );

    const acceptableDerivation = numL1Blocks.mul(1).div(10);

    // TODO Check within bounds efficiently
  }
}

/* eslint-enable @typescript-eslint/no-unused-vars */
