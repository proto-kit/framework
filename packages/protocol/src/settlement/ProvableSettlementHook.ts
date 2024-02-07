import { Field, UInt32 } from "o1js";

import type { BlockProof } from "../prover/block/BlockProver";
import { ProtocolModule } from "../protocol/ProtocolModule";
import { NetworkState } from "../model/network/NetworkState";

import type { SettlementContract } from "./SettlementContract";

export type SettlementStateRecord = {
  sequencerKey: Field;
  lastSettlementL1Block: UInt32;

  stateRoot: Field;
  networkStateHash: Field;
  blockHashRoot: Field;

  promisedMessagesHash: Field;
  honoredMessagesHash: Field;
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
  Config
> extends ProtocolModule<Config> {
  public abstract beforeSettlement(
    smartContract: SettlementContract,
    inputs: SettlementHookInputs
  ): void;
}
