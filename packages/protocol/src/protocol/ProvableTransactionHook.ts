import { NoConfig } from "@proto-kit/common";
import { Signature } from "o1js";

import { RuntimeTransaction } from "../model/transaction/RuntimeTransaction";
import { NetworkState } from "../model/network/NetworkState";
import { MethodPublicOutput } from "../model/MethodPublicOutput";
import type {
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
  networkState: NetworkState;
  prover: ProvableHookBlockState;
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
}
