import { Field, PublicKey, UInt32 } from "o1js";
import { InferProofBase } from "@proto-kit/common";

import { ProtocolModule } from "../../protocol/ProtocolModule";
import { ProvableNetworkState } from "../../model/network/NetworkState";
import type { BlockProof } from "../../prover/block/BlockProvable";
import type { SettlementContractType } from "../contracts/settlement/SettlementBase";

export type InputBlockProof = InferProofBase<BlockProof>;

export type SettlementStateRecord = {
  sequencerKey: PublicKey;
  lastSettlementL1BlockHeight: UInt32;

  stateRoot: Field;
  networkStateHash: Field;
  blockHashRoot: Field;
};

export type SettlementHookInputs = {
  blockProof: InputBlockProof;
  fromNetworkState: ProvableNetworkState;
  toNetworkState: ProvableNetworkState;
  newPromisedMessagesHash: Field;
  contractState: SettlementStateRecord;
  currentL1BlockHeight: UInt32;
};

export abstract class ProvableSettlementHook<
  Config,
> extends ProtocolModule<Config> {
  public abstract beforeSettlement(
    smartContract: SettlementContractType,
    inputs: SettlementHookInputs
  ): Promise<void>;
}
