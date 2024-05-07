import { Field, PublicKey, UInt32 } from "o1js";

import { ProtocolModule } from "../../protocol/ProtocolModule";
import { NetworkState } from "../../model/network/NetworkState";
import type { BlockProof } from "../../prover/block/BlockProver";
import type { SettlementSmartContract } from "../contracts/SettlementSmartContract";

export type SettlementStateRecord = {
  sequencerKey: PublicKey;
  lastSettlementL1Block: UInt32;

  stateRoot: Field;
  networkStateHash: Field;
  blockHashRoot: Field;
};

export type SettlementHookInputs = {
  blockProof: BlockProof;
  fromNetworkState: NetworkState;
  toNetworkState: NetworkState;
  newPromisedMessagesHash: Field;
  contractState: SettlementStateRecord;
  currentL1Block: UInt32;
};

export abstract class ProvableSettlementHook<
  Config,
> extends ProtocolModule<Config> {
  public abstract beforeSettlement(
    smartContract: SettlementSmartContract,
    inputs: SettlementHookInputs
  ): Promise<void>;
}
