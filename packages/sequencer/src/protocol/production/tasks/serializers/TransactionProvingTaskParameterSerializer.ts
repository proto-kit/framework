import {
  BlockProverExecutionData,
  BlockProverPublicInput,
  MethodPublicOutput,
  ReturnType,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "@proto-kit/protocol";

import { TaskSerializer } from "../../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../../helpers/utils";
import type { TransactionProvingTaskParameters } from "../TransactionProvingTask";
import type { JSONEncodableState } from "../RuntimeProvingTask";

import { DecodedStateSerializer } from "./DecodedStateSerializer";
import { RuntimeVerificationKeyAttestationSerializer } from "./RuntimeVerificationKeyAttestationSerializer";

export class TransactionProvingTaskParameterSerializer
  implements TaskSerializer<TransactionProvingTaskParameters>
{
  public constructor(
    private readonly stProofSerializer: ProofTaskSerializer<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    private readonly runtimeProofSerializer: ProofTaskSerializer<
      undefined,
      MethodPublicOutput
    >
  ) {}

  toJSON(input: TransactionProvingTaskParameters): string {
    const jsonReadyObject = {
      input1: this.stProofSerializer.toJSON(input.input1),
      input2: this.runtimeProofSerializer.toJSON(input.input2),

      params: {
        publicInput: BlockProverPublicInput.toJSON(input.params.publicInput),

        executionData: BlockProverExecutionData.toJSON(
          input.params.executionData
        ),

        startingState: DecodedStateSerializer.toJSON(
          input.params.startingState
        ),

        verificationKeyAttestation:
          RuntimeVerificationKeyAttestationSerializer.toJSON(
            input.params.verificationKeyAttestation
          ),
      },
    };
    return JSON.stringify(jsonReadyObject);
  }

  async fromJSON(json: string): Promise<TransactionProvingTaskParameters> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonReadyObject: {
      input1: string;
      input2: string;
      params: {
        publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
        executionData: ReturnType<typeof BlockProverExecutionData.toJSON>;
        startingState: JSONEncodableState;
        verificationKeyAttestation: ReturnType<
          typeof RuntimeVerificationKeyAttestationSerializer.toJSON
        >;
      };
    } = JSON.parse(json);

    return {
      input1: await this.stProofSerializer.fromJSON(jsonReadyObject.input1),
      input2: await this.runtimeProofSerializer.fromJSON(
        jsonReadyObject.input2
      ),

      params: {
        publicInput: BlockProverPublicInput.fromJSON(
          jsonReadyObject.params.publicInput
        ),

        executionData: BlockProverExecutionData.fromJSON(
          jsonReadyObject.params.executionData
        ),

        startingState: DecodedStateSerializer.fromJSON(
          jsonReadyObject.params.startingState
        ),

        verificationKeyAttestation:
          RuntimeVerificationKeyAttestationSerializer.fromJSON(
            jsonReadyObject.params.verificationKeyAttestation
          ),
      },
    };
  }
}
