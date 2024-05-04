import { PublicKey, Struct, UInt64 } from "o1js";
import { injectable } from "tsyringe";

import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { StateMap } from "../state/StateMap";
import { protocolState } from "../state/protocol/ProtocolState";
import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";
import { assert } from "../state/assert/assert";

export class AccountState extends Struct({
  nonce: UInt64,
}) {}

@injectable()
export class AccountStateHook extends ProvableTransactionHook {
  @protocolState() public accountState = StateMap.from<PublicKey, AccountState>(
    PublicKey,
    AccountState
  );

  public async onTransaction({ transaction }: BlockProverExecutionData) {
    const sender = transaction.sender.value;

    const aso = this.accountState.get(sender);

    const accountState = aso.orElse(new AccountState({ nonce: UInt64.zero }));

    const currentNonce = accountState.nonce;

    // Either the nonce matches or the tx is a message, in which case we don't care
    assert(
      currentNonce
        .equals(transaction.nonce.value)
        .or(transaction.sender.isSome.not()),
      () =>
        `Nonce not matching: tx sent ${transaction.nonce.value.toString()}, onchain value is ${currentNonce.toString()}`
    );

    // Optimized version of transaction.sender.isSome ? currentNonce.add(1) : Field(0)
    // Bcs Bool(true).toField() == 1
    // TODO Think about if we want to rangecheck this. If not, we should store it as Field
    const newNonce = UInt64.Unsafe.fromField(
      currentNonce.value.add(1).mul(transaction.sender.isSome.toField())
    );

    this.accountState.set(sender, new AccountState({ nonce: newNonce }));
  }
}
