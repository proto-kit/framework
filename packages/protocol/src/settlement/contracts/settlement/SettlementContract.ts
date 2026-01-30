import {
  State,
  UInt32,
  AccountUpdateForest,
  state,
  method,
  PublicKey,
  Field,
  Signature,
  DeployArgs,
  Permissions,
} from "o1js";
import { O1PublicKeyOption } from "@proto-kit/common";

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

  public async deployAndInitialize(
    args: DeployArgs | undefined,
    permissions: Permissions,
    sequencer: PublicKey,
    dispatchContract: O1PublicKeyOption
  ): Promise<void> {
    dispatchContract.assertNone(
      "Non-bridging settlement contract doesn't require a dispatch contract"
    );

    await super.deploy(args);

    this.self.account.permissions.set(permissions);

    await this.initializeBase(sequencer);
  }

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
