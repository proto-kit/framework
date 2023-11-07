import { TransitioningProtocolModule } from "./TransitioningProtocolModule";
import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { Proof } from "o1js";
import {
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../prover/statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../model/MethodPublicOutput";
import { BlockProverState } from "../prover/block/BlockProver";

type BlockHookParams = {
  state: BlockProverState;
  stateTransitionProof: Proof<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  >;
  appProof: Proof<void, MethodPublicOutput>;
  executionData: BlockProverExecutionData;
};

export abstract class ProvableBlockHook<
  Config
> extends TransitioningProtocolModule<Config> {
  public internalOnBlock(blockData: BlockHookParams) {

  }

  // Purpose is to validate transition from -> to network state
  public abstract onBlock(blockData: BlockHookParams): void;
}


export class UnprovenBlockHeightHook extends ProvableBlockHook<{}>{
  public onBlock(blockData: BlockHookParams): void {

  }
}