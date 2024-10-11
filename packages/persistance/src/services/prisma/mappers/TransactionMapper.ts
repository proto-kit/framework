import { singleton, injectable } from "tsyringe";
import {
  PendingTransaction,
  TransactionExecutionResult,
} from "@proto-kit/sequencer";
import {
  Transaction as DBTransaction,
  TransactionExecutionResult as DBTransactionExecutionResult,
} from "@prisma/client";
import { Bool } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionArrayMapper } from "./StateTransitionMapper";
import { EventArrayMapper } from "./EventMapper";

@singleton()
@injectable()
export class TransactionMapper
  implements ObjectMapper<PendingTransaction, DBTransaction>
{
  public mapIn(input: DBTransaction): PendingTransaction {
    return PendingTransaction.fromJSON({
      ...input,
      signature: {
        r: input.signature_r,
        s: input.signature_s,
      },
    });
  }

  public mapOut(input: PendingTransaction): DBTransaction {
    const json = input.toJSON();
    return {
      methodId: json.methodId,
      nonce: json.nonce,
      sender: json.sender,
      argsFields: json.argsFields,
      auxiliaryData: json.auxiliaryData,
      isMessage: json.isMessage,
      signature_r: json.signature.r,
      signature_s: json.signature.s,
      hash: input.hash().toString(),
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
    private readonly stArrayMapper: StateTransitionArrayMapper,
    private readonly eventArrayMapper: EventArrayMapper
  ) {}

  public mapIn(
    input: [Omit<DBTransactionExecutionResult, "blockHash">, DBTransaction]
  ): TransactionExecutionResult {
    const executionResult = input[0];
    return {
      tx: this.transactionMapper.mapIn(input[1]),
      status: Bool(executionResult.status),
      statusMessage: executionResult.statusMessage ?? undefined,
      stateTransitions: this.stArrayMapper.mapIn(
        executionResult.stateTransitions
      ),
      protocolTransitions: this.stArrayMapper.mapIn(
        executionResult.protocolTransitions
      ),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      events: this.eventArrayMapper.mapIn(executionResult.events),
    };
  }

  mapOut(
    input: TransactionExecutionResult
  ): [Omit<DBTransactionExecutionResult, "blockHash">, DBTransaction] {
    const tx = this.transactionMapper.mapOut(input.tx);
    const executionResult = {
      status: input.status.toBoolean(),
      statusMessage: input.statusMessage ?? null,
      stateTransitions: this.stArrayMapper.mapOut(input.stateTransitions),
      protocolTransitions: this.stArrayMapper.mapOut(input.protocolTransitions),
      events: this.eventArrayMapper.mapOut(input.events),
      txHash: tx.hash,
    };
    return [executionResult, tx];
  }
}
