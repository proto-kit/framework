import { NoConfig } from "@proto-kit/common";
import { Field } from "o1js";

import { NetworkState } from "../model/network/NetworkState";
import { MethodPublicOutput } from "../model/MethodPublicOutput";
import { TransactionProverState } from "../prover/transaction/TransactionProvable";
import { AuthorizedTransaction } from "../model/transaction/AuthorizedTransaction";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export type ProvableHookTransactionState = {
  transactionsHash: Field;
  eternalTransactionsHash: Field;
  incomingMessagesHash: Field;
};

export function toProvableHookTransactionState(
  state: Pick<
    TransactionProverState,
    "transactionList" | "eternalTransactionsList" | "incomingMessages"
  >
): ProvableHookTransactionState {
  const { transactionList, eternalTransactionsList, incomingMessages } = state;
  return {
    transactionsHash: transactionList.commitment,
    eternalTransactionsHash: eternalTransactionsList.commitment,
    incomingMessagesHash: incomingMessages.commitment,
  };
}

export function toBeforeTransactionHookArgument(
  authorizedTransaction: AuthorizedTransaction,
  networkState: NetworkState,
  state: Parameters<typeof toProvableHookTransactionState>[0]
): BeforeTransactionHookArguments {
  return {
    networkState,
    transaction: authorizedTransaction,
    prover: toProvableHookTransactionState(state),
  };
}

export function toAfterTransactionHookArgument(
  authorizedTransaction: AuthorizedTransaction,
  networkState: NetworkState,
  state: Parameters<typeof toProvableHookTransactionState>[0],
  runtimeResult: MethodPublicOutput
): AfterTransactionHookArguments {
  return {
    ...toBeforeTransactionHookArgument(
      authorizedTransaction,
      networkState,
      state
    ),
    runtimeResult,
  };
}

/**
 * This type is a reduced set of the runtime method's public output.
 * It omits internal commitments to data that is already present as data in
 * the hook arguments
 */
export type TransactionResult = Omit<
  MethodPublicOutput,
  "networkStateHash" | "transactionHash"
>;

export interface BeforeTransactionHookArguments {
  transaction: AuthorizedTransaction;
  networkState: NetworkState;
  prover: ProvableHookTransactionState;
}

export interface AfterTransactionHookArguments
  extends BeforeTransactionHookArguments {
  runtimeResult: TransactionResult;
}

export abstract class ProvableTransactionHook<
  Config = NoConfig,
> extends TransitioningProtocolModule<Config> {
  public abstract beforeTransaction(
    executionData: BeforeTransactionHookArguments
  ): Promise<void>;

  public abstract afterTransaction(
    execution: AfterTransactionHookArguments
  ): Promise<void>;

  public async removeTransactionWhen(
    execution: BeforeTransactionHookArguments
  ): Promise<boolean> {
    return false;
  }
}
