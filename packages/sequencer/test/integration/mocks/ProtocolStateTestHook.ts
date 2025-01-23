import {
  AfterTransactionHookArguments,
  BeforeTransactionHookArguments,
  protocolState,
  ProvableTransactionHook,
  StateMap,
} from "@proto-kit/protocol";
import { Field } from "o1js";
import { noop } from "@proto-kit/common";

/**
 * A hook used to test protocolstate inside the blockproduction tests
 */
export class ProtocolStateTestHook extends ProvableTransactionHook {
  @protocolState() methodIdInvocations = StateMap.from(Field, Field);

  public async beforeTransaction(
    executionData: BeforeTransactionHookArguments
  ): Promise<void> {
    const { methodId } = executionData.transaction;
    const invocations = await this.methodIdInvocations.get(methodId);
    await this.methodIdInvocations.set(
      methodId,
      invocations.orElse(Field(0)).add(1)
    );
  }

  public async afterTransaction(execution: AfterTransactionHookArguments) {
    noop();
  }
}
