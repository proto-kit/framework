import {
  Bool,
  DynamicProof,
  Field,
  Proof,
  Signature,
  Struct,
  Void,
} from "o1js";
import { WithZkProgrammable, CompilableModule } from "@proto-kit/common";

import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import { NetworkState } from "../../model/network/NetworkState";

import { BlockHashMerkleTreeWitness } from "./accummulators/BlockHashMerkleTree";
import { RuntimeVerificationKeyAttestation } from "./accummulators/RuntimeVerificationKeyTree";

export class BlockProverPublicInput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
}) {}

export class BlockProverPublicOutput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
  closed: Bool,
  blockNumber: Field,
}) {
  public equals(
    input: BlockProverPublicInput,
    closed: Bool,
    blockNumber: Field
  ): Bool {
    const output2 = BlockProverPublicOutput.toFields({
      ...input,
      closed,
      blockNumber,
    });
    const output1 = BlockProverPublicOutput.toFields(this);
    return output1
      .map((value1, index) => value1.equals(output2[index]))
      .reduce((a, b) => a.and(b));
  }
}

export type BlockProverProof = Proof<
  BlockProverPublicInput,
  BlockProverPublicOutput
>;

export class BlockProverExecutionData extends Struct({
  transaction: RuntimeTransaction,
  signature: Signature,
  networkState: NetworkState,
}) {}

export class DynamicRuntimeProof extends DynamicProof<
  Void,
  MethodPublicOutput
> {
  static publicInputType = Void;

  static publicOutputType = MethodPublicOutput;

  // TODO this won't be 0 for proofs-as-args
  static maxProofsVerified = 0 as const;
}

export interface BlockProvable
  extends WithZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput>,
    CompilableModule {
  proveTransaction: (
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: DynamicRuntimeProof,
    executionData: BlockProverExecutionData,
    verificationKeyAttestation: RuntimeVerificationKeyAttestation
  ) => Promise<BlockProverPublicOutput>;

  proveBlock: (
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    // stateTransitionProof: StateTransitionProof,
    transactionProof: BlockProverProof
  ) => Promise<BlockProverPublicOutput>;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ) => Promise<BlockProverPublicOutput>;
}
