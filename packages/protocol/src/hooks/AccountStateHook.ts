import { Provable, PublicKey, Struct, UInt64 } from "o1js";

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
    const sender = transaction.sender.value;

    const accountState = this.accountState
      .get(sender)
      .orElse(new AccountState({ nonce: UInt64.zero }));

    const currentNonce = accountState.nonce;

    // Either the nonce matches or the tx is a message, in which case we don't care
    assert(
      currentNonce
        .equals(transaction.nonce.value)
        .or(transaction.sender.isSome.not()),
      "Nonce not matching"
    );

    // Optimized version of transaction.sender.isSome ? currentNonce.add(1) : Field(0)
    // Bcs Bool(true).toField() == 1
    const newNonce = UInt64.from(
      currentNonce.value.add(1).mul(transaction.sender.isSome.toField())
    );

    this.accountState.set(sender, new AccountState({ nonce: newNonce }));
  }
}
