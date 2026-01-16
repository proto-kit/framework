import { Field } from "o1js";
import { NoConfig } from "@proto-kit/common";

import { ProvableNetworkState } from "../model/network/NetworkState";
import {
  BlockProverState,
  BlockProverPublicInput,
} from "../prover/block/BlockProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export type ProvableHookBlockState = Pick<
  BlockProverPublicInput,
  | "transactionsHash"
  | "eternalTransactionsHash"
  | "incomingMessagesHash"
  | "blockHashRoot"
>;

export function toProvableHookBlockState(
  state: Pick<
    BlockProverState,
    | "transactionList"
    | "eternalTransactionsList"
    | "incomingMessages"
    | "blockHashRoot"
  >
) {
  const {
    transactionList,
    eternalTransactionsList,
    incomingMessages,
    blockHashRoot,
  } = state;
  return {
    transactionsHash: transactionList.commitment,
    eternalTransactionsHash: eternalTransactionsList.commitment,
    incomingMessagesHash: incomingMessages.commitment,
    blockHashRoot,
  };
}

export interface BeforeBlockHookArguments extends ProvableHookBlockState {}

export interface AfterBlockHookArguments extends BeforeBlockHookArguments {
  stateRoot: Field;
}

// Purpose is to build transition from -> to network state
export abstract class ProvableBlockHook<
  Config = NoConfig,
> extends TransitioningProtocolModule<Config> {
  public abstract beforeBlock(
    networkState: ProvableNetworkState,
    state: BeforeBlockHookArguments
  ): Promise<ProvableNetworkState>;

  public abstract afterBlock(
    networkState: ProvableNetworkState,
    state: AfterBlockHookArguments
  ): Promise<ProvableNetworkState>;
}
