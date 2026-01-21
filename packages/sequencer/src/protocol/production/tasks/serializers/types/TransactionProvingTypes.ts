import {
  MethodPublicOutput,
  TransactionProverExecutionData,
  TransactionProverPublicInput,
} from "@proto-kit/protocol";
import { Proof } from "o1js";

import type { TaskStateRecord } from "../../../tracing/BlockTracingService";

export type RuntimeProof = Proof<void, MethodPublicOutput>;

export interface TransactionProverTaskParameters {
  publicInput: TransactionProverPublicInput;
  executionData: TransactionProverExecutionData;
  startingState: TaskStateRecord[];
}

export type OneOrTwo<Type> = [Type] | [Type, Type];

export type TransactionProvingTaskParameters = OneOrTwo<{
  parameters: TransactionProverTaskParameters;
  proof: RuntimeProof;
}>;
