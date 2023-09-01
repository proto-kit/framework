import { BlockProverExecutionData } from "../prover/block/BlockProvable";

import { ProtocolModule } from "./ProtocolModule";

export abstract class ProvableTransactionHook extends ProtocolModule {
  public abstract onTransaction(executionData: BlockProverExecutionData): void;

  public name?: string;
}
