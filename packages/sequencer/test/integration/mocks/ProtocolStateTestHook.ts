import {
  BlockProverExecutionData,
  protocolState,
  ProvableTransactionHook,
  StateMap,
} from "@proto-kit/protocol";
import { Field } from "o1js";

/**
 * A hook used to test protocolstate inside the blockproduction tests
 */
export class ProtocolStateTestHook extends ProvableTransactionHook {
  @protocolState() methodIdInvocations = StateMap.from(Field, Field);

  public onTransaction(executionData: BlockProverExecutionData): void {
    const { methodId } = executionData.transaction;
    const invocations = this.methodIdInvocations.get(methodId);
    this.methodIdInvocations.set(methodId, invocations.orElse(Field(0)).add(1));
  }
}
