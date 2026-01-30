import { Field } from "o1js";
import { NoConfig } from "@proto-kit/common";

import { NetworkState } from "../model/network/NetworkState";
import {
  BlockProverPublicInput,
  BlockArguments,
  BlockProverState,
} from "../prover/block/BlockProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export type ProvableHookBlockState = Pick<
  BlockProverPublicInput & BlockArguments,
  "eternalTransactionsHash" | "incomingMessagesHash" | "blockHashRoot"
>;

export function toBeforeBlockHookArgument(
  state: Pick<
    BlockProverState,
    "eternalTransactionsList" | "incomingMessages" | "blockHashRoot"
  >
) {
  const { eternalTransactionsList, incomingMessages, blockHashRoot } = state;
  return {
    eternalTransactionsHash: eternalTransactionsList.commitment,
    incomingMessagesHash: incomingMessages.commitment,
    blockHashRoot,
  };
}

export function toAfterBlockHookArgument(
  state: Pick<
    BlockProverState,
    "eternalTransactionsList" | "incomingMessages" | "blockHashRoot"
  >,
  stateRoot: Field,
  transactionsHash: Field
) {
  return {
    ...toBeforeBlockHookArgument(state),
    stateRoot,
    transactionsHash,
  };
}

export interface BeforeBlockHookArguments extends ProvableHookBlockState {}

export interface AfterBlockHookArguments extends BeforeBlockHookArguments {
  stateRoot: Field;
  transactionsHash: Field;
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
