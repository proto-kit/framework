import { NoConfig } from "@proto-kit/common";

import { BlockProverExecutionData } from "../prover/block/BlockProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export abstract class ProvableTransactionHook<
  Config = NoConfig,
> extends TransitioningProtocolModule<Config> {
  public abstract onTransaction(
    executionData: BlockProverExecutionData
  ): Promise<void>;
}
