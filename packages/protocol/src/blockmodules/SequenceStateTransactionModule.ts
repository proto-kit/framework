import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";
import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { protocolState } from "../state/protocol/ProtocolState";
import { State } from "../state/State";
import { Field } from "o1js";
import { DefaultProvableHashList } from "../utils/ProvableHashList";
import { ProtocolTransaction } from "../model/transaction/ProtocolTransaction";

export class SequenceStateTransactionModule extends ProvableTransactionHook {
  @protocolState() sequenceStateTransactionsList = State.from(Field);

  public onTransaction(executionData: BlockProverExecutionData): void {
    const hashList = new DefaultProvableHashList(
      ProtocolTransaction,
      this.sequenceStateTransactionsList.get().orElse(Field(0))
    );

    hashList.push(executionData.transaction);

    this.sequenceStateTransactionsList.set(hashList.commitment);
  }
}
