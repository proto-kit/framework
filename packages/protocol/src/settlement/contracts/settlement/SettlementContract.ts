import {
  State,
  UInt32,
  AccountUpdateForest,
  state,
  method,
  PublicKey,
  Field,
  Signature,
} from "o1js";

import { NetworkState } from "../../../model/network/NetworkState";

import {
  DynamicBlockProof,
  SettlementBase,
  SettlementContractType,
} from "./SettlementBase";

export class SettlementContract
  extends SettlementBase
  implements SettlementContractType
{
  @state(Field) sequencerKey = State<Field>();

  @state(UInt32) lastSettlementL1BlockHeight = State<UInt32>();

  @state(Field) stateRoot = State<Field>();

  @state(Field) networkStateHash = State<Field>();

  @state(Field) blockHashRoot = State<Field>();

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method async settle(
    blockProof: DynamicBlockProof,
    signature: Signature,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ): Promise<void> {
    await super.settleBase(
      blockProof,
      signature,
      publicKey,
      inputNetworkState,
      outputNetworkState,
      newPromisedMessagesHash
    );
  }
}
