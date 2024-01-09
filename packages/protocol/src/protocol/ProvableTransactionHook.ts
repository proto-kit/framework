import { BlockProverExecutionData } from "../prover/block/BlockProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";
import { NoConfig } from "@proto-kit/common";

export abstract class ProvableTransactionHook<
  Config = NoConfig
> extends TransitioningProtocolModule<Config> {
  public abstract onTransaction(executionData: BlockProverExecutionData): void;
}
