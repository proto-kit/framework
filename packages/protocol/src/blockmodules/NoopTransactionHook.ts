import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";
import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { NoConfig } from "@proto-kit/common";

export class NoopTransactionHook extends ProvableTransactionHook<NoConfig> {
  public onTransaction(executionData: BlockProverExecutionData): void {
  }
}