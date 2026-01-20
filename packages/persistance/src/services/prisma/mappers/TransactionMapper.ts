import { singleton, injectable } from "tsyringe";
import {
  TransactionExecutionResult,
  PendingTransaction,
} from "@proto-kit/sequencer";
import {
  Transaction as DBTransaction,
  TransactionExecutionResult as DBTransactionExecutionResult,
} from "@prisma/client";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionBatchArrayMapper } from "./StateTransitionMapper";
import { EventArrayMapper } from "./EventMapper";

@singleton()
@injectable()
export class TransactionMapper
  implements ObjectMapper<PendingTransaction, DBTransaction>
{
  public mapIn(input: DBTransaction): PendingTransaction {
    return new PendingTransaction({
      ...input,
      signature: {
        r: input.signature_r,
        s: input.signature_s,
      },
    });
  }

  public mapOut(input: PendingTransaction): DBTransaction {
    return {
      hash: input.hash,
      methodId: input.methodId,
      nonce: input.nonce,
      sender: input.sender,
      argsFields: input.argsFields,
      auxiliaryData: input.auxiliaryData,
      isMessage: input.isMessage,
      signature_r: input.signature.r,
      signature_s: input.signature.s,
    };
  }
}

@singleton()
export class TransactionExecutionResultMapper
  implements
    ObjectMapper<
      TransactionExecutionResult,
      [Omit<DBTransactionExecutionResult, "blockHash">, DBTransaction]
    >
{
  public constructor(
    private readonly transactionMapper: TransactionMapper,
    private readonly stBatchMapper: StateTransitionBatchArrayMapper,
    private readonly eventArrayMapper: EventArrayMapper
  ) {}

  public mapIn(
    input: [Omit<DBTransactionExecutionResult, "blockHash">, DBTransaction]
  ): TransactionExecutionResult {
    const executionResult = input[0];
    return {
      tx: this.transactionMapper.mapIn(input[1]),
      status: executionResult.status,
      hooksStatus: executionResult.hooksStatus,
      statusMessage: executionResult.statusMessage ?? undefined,
      stateTransitions: this.stBatchMapper.mapIn(
        executionResult.stateTransitions
      ),
      events: this.eventArrayMapper.mapIn(executionResult.events),
    };
  }

  mapOut(
    input: TransactionExecutionResult
  ): [Omit<DBTransactionExecutionResult, "blockHash">, DBTransaction] {
    const tx = this.transactionMapper.mapOut(input.tx);
    const executionResult = {
      status: input.status,
      hooksStatus: input.hooksStatus,
      statusMessage: input.statusMessage ?? null,
      stateTransitions: this.stBatchMapper.mapOut(input.stateTransitions),
      events: this.eventArrayMapper.mapOut(input.events),
      txHash: tx.hash,
    };
    return [executionResult, tx];
  }
}
