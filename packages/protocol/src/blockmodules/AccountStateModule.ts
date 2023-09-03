import { PublicKey, Struct, UInt64 } from "snarkyjs";

import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { StateMap } from "../state/StateMap";
import { protocolState } from "../state/protocol/ProtocolState";
import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";

export class AccountState extends Struct({
  nonce: UInt64,
}) {}

export class AccountStateModule extends ProvableTransactionHook {
  @protocolState() public accountState = StateMap.from(PublicKey, AccountState);

  public onTransaction({ transaction }: BlockProverExecutionData): void {
    const accountState = this.accountState
      .get(transaction.sender)
      .orElse(new AccountState({ nonce: UInt64.zero }));

    const currentNonce = accountState.nonce;
    currentNonce.equals(transaction.nonce).assertTrue("Nonce not matching");

    this.accountState.set(
      transaction.sender,
      new AccountState({ nonce: currentNonce.add(1) })
    );
  }
}
