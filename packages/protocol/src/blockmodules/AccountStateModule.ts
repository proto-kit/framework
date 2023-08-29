import { FlexibleProvable, PublicKey, Struct, UInt64 } from "snarkyjs";

import { BlockModule } from "../protocol/BlockModule";
import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { StateMap } from "../state/StateMap";
import { protocolState } from "../state/protocol/ProtocolState";

export class AccountState extends Struct({
  nonce: UInt64,
}) {}

export class AccountStateModule implements BlockModule {
  @protocolState() accountState = StateMap.from(PublicKey, AccountState);

  public createTransitions(executionData: BlockProverExecutionData) {
    const x: FlexibleProvable<AccountState> = AccountState;
  }
}
