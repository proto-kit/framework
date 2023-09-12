import { BlockProverExecutionData } from "../prover/block/BlockProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export abstract class ProvableTransactionHook extends TransitioningProtocolModule {
  public abstract onTransaction(executionData: BlockProverExecutionData): void;
}
