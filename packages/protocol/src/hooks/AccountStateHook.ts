import { PublicKey, Struct, UInt64 } from "o1js";

import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { StateMap } from "../state/StateMap";
import { protocolState } from "../state/protocol/ProtocolState";
import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";
import { assert } from "../state/assert/assert";
import { injectable } from "tsyringe";

export class AccountState extends Struct({
  nonce: UInt64,
}) {}

@injectable()
export class AccountStateHook extends ProvableTransactionHook {
  @protocolState() public accountState = StateMap.from<PublicKey, AccountState>(
    PublicKey,
    AccountState
  );

  public onTransaction({ transaction }: BlockProverExecutionData): void {
    const accountState = this.accountState
      .get(transaction.sender)
      .orElse(new AccountState({ nonce: UInt64.zero }));

    const currentNonce = accountState.nonce;

    assert(currentNonce.equals(transaction.nonce), "Nonce not matching");

    this.accountState.set(
      transaction.sender,
      new AccountState({ nonce: currentNonce.add(1) })
    );
  }
}
