import { Field } from "o1js";
import { NoConfig } from "@proto-kit/common";

import { NetworkState } from "../model/network/NetworkState";
import {
  BlockProverState,
  BlockProverStateCommitments,
} from "../prover/block/BlockProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export type ProvableHookBlockState = Pick<
  BlockProverStateCommitments,
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
    networkState: NetworkState,
    state: BeforeBlockHookArguments
  ): Promise<NetworkState>;

  public abstract afterBlock(
    networkState: NetworkState,
    state: AfterBlockHookArguments
  ): Promise<NetworkState>;
}
