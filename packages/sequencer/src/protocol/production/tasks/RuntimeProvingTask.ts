import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MethodIdResolver,
  MethodParameterEncoder,
  Runtime,
} from "@proto-kit/module";
import {
  MethodPublicOutput,
  ProvableNetworkState,
  NetworkState,
  RuntimeMethodExecutionContext,
} from "@proto-kit/protocol";
import { Field, Proof } from "o1js";
import { CompileRegistry } from "@proto-kit/common";

import { Task, TaskSerializer } from "../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import {
  PendingTransaction,
} from "../../../mempool/PendingTransaction";

import { RuntimeProofParametersSerializer } from "./serializers/RuntimeProofParametersSerializer";
import { DecodedStateSerializer, JSONEncodableState } from "./serializers/DecodedStateSerializer";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;

export interface RuntimeProofParameters {
  tx: PendingTransaction;
  networkState: NetworkState;
  state: JSONEncodableState;
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class RuntimeProvingTask
  extends TaskWorkerModule
  implements Task<RuntimeProofParameters, RuntimeProof>
{
  protected readonly runtimeZkProgrammable =
    this.runtime.zkProgrammable.zkProgram;

  public name = "runtimeProof";

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>,
    private readonly executionContext: RuntimeMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
  }

  public inputSerializer(): TaskSerializer<RuntimeProofParameters> {
    return new RuntimeProofParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<RuntimeProof> {
    return new ProofTaskSerializer(this.runtimeZkProgrammable[0].Proof);
  }

  public async compute(
    input: RuntimeProofParameters
  ): Promise<RuntimeProof> {
    // Convert from JSON to provable types at the proving boundary
    const tx = input.tx;
    const networkState = new ProvableNetworkState(
      ProvableNetworkState.fromJSON(input.networkState)
    );

    const method = this.runtime.getMethodById(tx.methodId);

    const methodDescriptors = this.runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodNameFromId(tx.methodId);

    if (methodDescriptors === undefined || method === undefined) {
      throw new Error(`MethodId not found ${tx.methodId}`);
    }

    const [moduleName, methodName] = methodDescriptors;

    const parameterEncoder = MethodParameterEncoder.fromMethod(
      this.runtime.resolve(moduleName),
      methodName
    );
    const decodedArguments = await parameterEncoder.decode(
      tx.argsFields.map(Field),
      tx.auxiliaryData
    );

    const prefilledStateService = new PreFilledStateService(
      DecodedStateSerializer.fromJSON(input.state)
    );
    this.runtime.stateServiceProvider.setCurrentStateService(
      prefilledStateService
    );

    // Set network state and transaction for the runtimemodule to access
    const { transaction, signature } = tx.toProtocolTransaction();
    const contextInputs = {
      networkState,
      transaction,
      signature,
    };
    this.executionContext.setup(contextInputs);

    await method(...decodedArguments);
    const { result } = this.executionContext.current();

    this.executionContext.setup(contextInputs);
    const proof = await result.prove<RuntimeProof>();

    this.runtime.stateServiceProvider.popCurrentStateService();
    return proof;
  }

  public async prepare(): Promise<void> {
    await this.runtime.compile(this.compileRegistry);
  }
}
