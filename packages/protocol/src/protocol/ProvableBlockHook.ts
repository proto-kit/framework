import { Field } from "o1js";
import { NoConfig } from "@proto-kit/common";

import { NetworkState } from "../model/network/NetworkState";
import { MethodPublicOutput } from "../model/MethodPublicOutput";
import { BlockProverTransactionArguments } from "../prover/block/BlockProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";
import {
  AfterTransactionHookArguments,
  BeforeTransactionHookArguments,
  ProvableHookBlockState,
  toProvableHookBlockState,
} from "./ProvableTransactionHook";

export interface BeforeBlockHookArguments extends ProvableHookBlockState {}

export interface AfterBlockHookArguments extends BeforeBlockHookArguments {
  stateRoot: Field;
}

export function toBeforeTransactionHookArgument(
  executionData: Omit<
    BlockProverTransactionArguments,
    "verificationKeyAttestation"
  >,
  networkState: NetworkState,
  state: Parameters<typeof toProvableHookBlockState>[0]
): BeforeTransactionHookArguments {
  const { transaction, signature } = executionData;

  return {
    networkState,
    transaction,
    signature,
    prover: toProvableHookBlockState(state),
  };
}

export function toAfterTransactionHookArgument(
  executionData: Omit<
    BlockProverTransactionArguments,
    "verificationKeyAttestation"
  >,
  networkState: NetworkState,
  state: Parameters<typeof toProvableHookBlockState>[0],
  runtimeResult: MethodPublicOutput
): AfterTransactionHookArguments {
  return {
    ...toBeforeTransactionHookArgument(executionData, networkState, state),
    runtimeResult,
  };
}

// Purpose is to build transition from -> to network state
export abstract class ProvableBlockHook<
  Config = NoConfig,
> extends TransitioningProtocolModule<Config> {
  public abstract beforeBlock(
    networkState: NetworkState,
    state: BeforeBlockHookArguments
  ): Promise<NetworkState>;

  public abstract afterBlock(
    networkState: NetworkState,
    state: AfterBlockHookArguments
  ): Promise<NetworkState>;
}
