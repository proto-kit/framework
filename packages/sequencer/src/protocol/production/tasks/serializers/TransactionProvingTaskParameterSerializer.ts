import {
  MethodPublicOutput,
  ReturnType,
  RuntimeTransaction,
  TransactionProverPublicInput,
  TransactionProverTransactionArguments,
  TransactionProverArguments,
} from "@proto-kit/protocol";
import { JsonProof, Signature } from "o1js";
import { assertSizeOneOrTwo, mapSequential } from "@proto-kit/common";

import { TaskSerializer } from "../../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../../helpers/utils";

import {
  TransactionProverTaskParameters,
  TransactionProvingTaskParameters,
} from "./types/TransactionProvingTypes";
import {
  DecodedStateSerializer,
  JSONEncodableState,
} from "./DecodedStateSerializer";
import { RuntimeVerificationKeyAttestationSerializer } from "./RuntimeVerificationKeyAttestationSerializer";

export type TransactionProvingTaskParametersJSON = {
  parameters: TransactionProverTaskParametersJSON;
  proof: JsonProof;
}[];

export type TransactionProverTaskParametersJSON = {
  startingState: JSONEncodableState[];
  publicInput: ReturnType<typeof TransactionProverPublicInput.toJSON>;
  executionData: {
    transaction: TransactionProverTransactionArgumentsJSON;
    args: ReturnType<typeof TransactionProverArguments.toJSON>;
  };
};

export type TransactionProverTransactionArgumentsJSON = {
  transaction: ReturnType<typeof RuntimeTransaction.toJSON>;
  signature: ReturnType<typeof Signature.toJSON>;
  verificationKeyAttestation: ReturnType<
    typeof RuntimeVerificationKeyAttestationSerializer.toJSON
  >;
};

export class TransactionProvingTaskParameterSerializer
  implements TaskSerializer<TransactionProvingTaskParameters>
{
  public constructor(
    private readonly runtimeProofSerializer: ProofTaskSerializer<
      void,
      MethodPublicOutput
    >
  ) {}

  private transactionProverArgumentsToJson(
    args: TransactionProverTransactionArguments
  ): TransactionProverTransactionArgumentsJSON {
    return {
      transaction: RuntimeTransaction.toJSON(args.transaction),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      signature: Signature.toJSON<typeof Signature>(args.signature),
      verificationKeyAttestation:
        RuntimeVerificationKeyAttestationSerializer.toJSON(
          args.verificationKeyAttestation
        ),
    };
  }

  private transactionProverArgumentsFromJson(
    args: TransactionProverTransactionArgumentsJSON
  ): TransactionProverTransactionArguments {
    return {
      transaction: new RuntimeTransaction(
        RuntimeTransaction.fromJSON(args.transaction)
      ),
      signature: Signature.fromJSON<typeof Signature>(args.signature),
      verificationKeyAttestation:
        RuntimeVerificationKeyAttestationSerializer.fromJSON(
          args.verificationKeyAttestation
        ),
    };
  }

  public toJSON(inputs: TransactionProvingTaskParameters): string {
    if (inputs === "dummy") {
      return "dummy";
    }

    const taskParamsJson: TransactionProvingTaskParametersJSON = inputs.map(
      (input) => {
        const { parameters, proof } = input;
        const { executionData } = parameters;

        const proofJSON = this.runtimeProofSerializer.toJSONProof(proof);

        const parametersJSON: TransactionProverTaskParametersJSON = {
          publicInput: TransactionProverPublicInput.toJSON(
            parameters.publicInput
          ),

          startingState: parameters.startingState.map((stateRecord) =>
            DecodedStateSerializer.toJSON(stateRecord)
          ),

          executionData: {
            args: TransactionProverArguments.toJSON(executionData.args),

            transaction: this.transactionProverArgumentsToJson(
              executionData.transaction
            ),
          },
        };

        return { parameters: parametersJSON, proof: proofJSON };
      }
    );

    return JSON.stringify(taskParamsJson);
  }

  public async fromJSON(
    json: string
  ): Promise<TransactionProvingTaskParameters> {
    if (json === "dummy") {
      return "dummy";
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonReadyObject: TransactionProvingTaskParametersJSON =
      JSON.parse(json);

    const result = await mapSequential(jsonReadyObject, async (input) => {
      const { parameters, proof } = input;

      const decodedProof =
        await this.runtimeProofSerializer.fromJSONProof(proof);

      const decodedParameters: TransactionProverTaskParameters = {
        publicInput: TransactionProverPublicInput.fromJSON(
          parameters.publicInput
        ),
        startingState: parameters.startingState.map((stateRecord) =>
          DecodedStateSerializer.fromJSON(stateRecord)
        ),
        executionData: {
          transaction: this.transactionProverArgumentsFromJson(
            parameters.executionData.transaction
          ),
          args: TransactionProverArguments.fromJSON(
            parameters.executionData.args
          ),
        },
      };
      return {
        parameters: decodedParameters,
        proof: decodedProof,
      };
    });

    assertSizeOneOrTwo(result);

    return result;
  }
}
