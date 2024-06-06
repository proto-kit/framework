import { noop } from "@proto-kit/common";

import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";
import { BlockProverExecutionData } from "../prover/block/BlockProvable";

export class NoopTransactionHook extends ProvableTransactionHook {
  public async onTransaction(executionData: BlockProverExecutionData) {
    noop();
  }
}
