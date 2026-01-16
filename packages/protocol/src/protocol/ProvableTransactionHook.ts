import { NoConfig } from "@proto-kit/common";
import { Signature } from "o1js";

import { RuntimeTransaction } from "../model/transaction/RuntimeTransaction";
import { ProvableNetworkState } from "../model/network/NetworkState";
import { MethodPublicOutput } from "../model/MethodPublicOutput";
import {
  TransactionProverPublicInput,
  TransactionProverState,
  TransactionProverTransactionArguments,
} from "../prover/transaction/TransactionProvable";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export type ProvableHookTransactionState = Pick<
  TransactionProverPublicInput,
  "transactionsHash" | "eternalTransactionsHash" | "incomingMessagesHash"
>;

export function toProvableHookTransactionState(
  state: Pick<
    TransactionProverState,
    "transactionList" | "eternalTransactionsList" | "incomingMessages"
  >
) {
  const { transactionList, eternalTransactionsList, incomingMessages } = state;
  return {
    transactionsHash: transactionList.commitment,
    eternalTransactionsHash: eternalTransactionsList.commitment,
    incomingMessagesHash: incomingMessages.commitment,
  };
}

export function toBeforeTransactionHookArgument(
  executionData: Omit<
    TransactionProverTransactionArguments,
    "verificationKeyAttestation"
  >,
  networkState: ProvableNetworkState,
  state: Parameters<typeof toProvableHookTransactionState>[0]
): BeforeTransactionHookArguments {
  const { transaction, signature } = executionData;

  return {
    networkState,
    transaction,
    signature,
    prover: toProvableHookTransactionState(state),
  };
}

export function toAfterTransactionHookArgument(
  executionData: Omit<
    TransactionProverTransactionArguments,
    "verificationKeyAttestation"
  >,
  networkState: ProvableNetworkState,
  state: Parameters<typeof toProvableHookTransactionState>[0],
  runtimeResult: MethodPublicOutput
): AfterTransactionHookArguments {
  return {
    ...toBeforeTransactionHookArgument(executionData, networkState, state),
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
  transaction: RuntimeTransaction;
  signature: Signature;
  networkState: ProvableNetworkState;
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
