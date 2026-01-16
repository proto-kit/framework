import {
  BlockProverPublicInput,
  MethodPublicOutput,
  ProvableNetworkState,
  ReturnType,
  RuntimeTransaction,
  TransactionProverTransactionArguments,
} from "@proto-kit/protocol";
import { JsonProof, Signature } from "o1js";

import { TaskSerializer } from "../../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../../helpers/utils";
import { TaskStateRecordJson } from "../../tracing/BlockTracingService";

import {
  TransactionProvingTaskParameters,
  TransactionProvingType,
} from "./types/TransactionProvingTypes";
import { RuntimeVerificationKeyAttestationSerializer } from "./RuntimeVerificationKeyAttestationSerializer";

export type TransactionProverTransactionArgumentsJSON = {
  transaction: ReturnType<typeof RuntimeTransaction.toJSON>;
  signature: ReturnType<typeof Signature.toJSON>;
  verificationKeyAttestation: ReturnType<
    typeof RuntimeVerificationKeyAttestationSerializer.toJSON
  >;
};

export type SingleExecutionDataJSON = {
  transaction: TransactionProverTransactionArgumentsJSON;
  networkState: ReturnType<typeof ProvableNetworkState.toJSON>;
};

export type MultiExecutionDataJSON = {
  transaction1: TransactionProverTransactionArgumentsJSON;
  transaction2: TransactionProverTransactionArgumentsJSON;
  networkState: ReturnType<typeof ProvableNetworkState.toJSON>;
};

export type TransactionProverTaskParametersJSON<
  ExecutionData extends SingleExecutionDataJSON | MultiExecutionDataJSON,
> = {
  startingState: TaskStateRecordJson[];
  publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
  executionData: ExecutionData;
};

export type TransactionProvingTaskParametersJSON =
  | {
      type: TransactionProvingType.SINGLE;
      proof1: JsonProof;
      parameters: TransactionProverTaskParametersJSON<SingleExecutionDataJSON>;
    }
  | {
      type: TransactionProvingType.MULTI;
      proof1: JsonProof;
      proof2: JsonProof;
      parameters: TransactionProverTaskParametersJSON<MultiExecutionDataJSON>;
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

  public toJSON(input: TransactionProvingTaskParameters): string {
    let taskParamsJson: TransactionProvingTaskParametersJSON;

    const { type, parameters } = input;

    const partialParameters = {
      publicInput: BlockProverPublicInput.toJSON(parameters.publicInput),

      startingState: parameters.startingState,
    };

    // The reason we can't just use the structs toJSON is that the VerificationKey
    // toJSON and fromJSON isn't consistent -> i.e. the serialization doesn't work
    // the same both ways. We fix that in our custom serializer
    if (type === TransactionProvingType.SINGLE) {
      const { executionData } = parameters;
      const executionDataJson: SingleExecutionDataJSON = {
        networkState: ProvableNetworkState.toJSON(executionData.networkState),
        transaction: this.transactionProverArgumentsToJson(
          executionData.transaction
        ),
      };

      taskParamsJson = {
        type,
        proof1: this.runtimeProofSerializer.toJSONProof(input.proof1),
        parameters: {
          ...partialParameters,
          executionData: executionDataJson,
        },
      };
    } else {
      const { executionData } = parameters;
      const executionDataJson: MultiExecutionDataJSON = {
        networkState: ProvableNetworkState.toJSON(executionData.networkState),
        transaction1: this.transactionProverArgumentsToJson(
          executionData.transaction1
        ),
        transaction2: this.transactionProverArgumentsToJson(
          executionData.transaction2
        ),
      };

      taskParamsJson = {
        type,
        proof1: this.runtimeProofSerializer.toJSONProof(input.proof1),
        proof2: this.runtimeProofSerializer.toJSONProof(input.proof2),
        parameters: {
          ...partialParameters,
          executionData: executionDataJson,
        },
      };
    }

    return JSON.stringify(taskParamsJson);
  }

  public async fromJSON(
    json: string
  ): Promise<TransactionProvingTaskParameters> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonReadyObject: TransactionProvingTaskParametersJSON =
      JSON.parse(json);

    const { type, parameters } = jsonReadyObject;

    const partialParameters = {
      publicInput: BlockProverPublicInput.fromJSON(parameters.publicInput),

      startingState: parameters.startingState,
    };

    if (type === TransactionProvingType.SINGLE) {
      return {
        type,
        proof1: await this.runtimeProofSerializer.fromJSONProof(
          jsonReadyObject.proof1
        ),
        parameters: {
          ...partialParameters,
          executionData: {
            transaction: this.transactionProverArgumentsFromJson(
              parameters.executionData.transaction
            ),
            networkState: new ProvableNetworkState(
              ProvableNetworkState.fromJSON(parameters.executionData.networkState)
            ),
          },
        },
      };
    }

    return {
      type,
      proof1: await this.runtimeProofSerializer.fromJSONProof(
        jsonReadyObject.proof1
      ),
      proof2: await this.runtimeProofSerializer.fromJSONProof(
        jsonReadyObject.proof2
      ),
      parameters: {
        ...partialParameters,
        executionData: {
          transaction1: this.transactionProverArgumentsFromJson(
            parameters.executionData.transaction1
          ),
          transaction2: this.transactionProverArgumentsFromJson(
            parameters.executionData.transaction2
          ),
          networkState: new ProvableNetworkState(
            ProvableNetworkState.fromJSON(parameters.executionData.networkState)
          ),
        },
      },
    };
  }
}
