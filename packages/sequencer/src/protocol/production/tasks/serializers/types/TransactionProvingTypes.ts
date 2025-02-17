import {
  BlockProverMultiTransactionExecutionData,
  BlockProverPublicInput,
  BlockProverSingleTransactionExecutionData,
  MethodPublicOutput,
} from "@proto-kit/protocol";
import { Proof } from "o1js";

import type { TaskStateRecord } from "../../../tracing/BlockTracingService";

export type RuntimeProof = Proof<void, MethodPublicOutput>;

export enum TransactionProvingType {
  SINGLE,
  MULTI,
}

export interface TransactionProverTaskParameters<
  ExecutionData extends
    | BlockProverSingleTransactionExecutionData
    | BlockProverMultiTransactionExecutionData,
> {
  publicInput: BlockProverPublicInput;
  executionData: ExecutionData;
  startingState: TaskStateRecord[];
}

export type TransactionProvingTaskParameters =
  | {
      type: TransactionProvingType.SINGLE;
      parameters: TransactionProverTaskParameters<BlockProverSingleTransactionExecutionData>;
      proof1: RuntimeProof;
    }
  | {
      type: TransactionProvingType.MULTI;
      parameters: TransactionProverTaskParameters<BlockProverMultiTransactionExecutionData>;
      proof1: RuntimeProof;
      proof2: RuntimeProof;
    };
