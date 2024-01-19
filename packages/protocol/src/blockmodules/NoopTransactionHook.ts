import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";
import { BlockProverExecutionData } from "../prover/block/BlockProvable";

export class NoopTransactionHook extends ProvableTransactionHook {
  public onTransaction(executionData: BlockProverExecutionData): void {}
}
