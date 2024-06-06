import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MethodIdResolver,
  MethodParameterEncoder,
  Runtime,
} from "@proto-kit/module";
import {
  MethodPublicOutput,
  RuntimeMethodExecutionContext,
} from "@proto-kit/protocol";
import { Proof } from "o1js";

import { Task, TaskSerializer } from "../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";

import {
  RuntimeProofParameters,
  RuntimeProofParametersSerializer,
} from "./RuntimeTaskParameters";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;

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
    private readonly executionContext: RuntimeMethodExecutionContext
  ) {
    super();
  }

  public inputSerializer(): TaskSerializer<RuntimeProofParameters> {
    return new RuntimeProofParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<RuntimeProof> {
    return new ProofTaskSerializer(this.runtimeZkProgrammable.Proof);
  }

  public async compute(input: RuntimeProofParameters): Promise<RuntimeProof> {
    const method = this.runtime.getMethodById(input.tx.methodId.toBigInt());

    const methodDescriptors = this.runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodNameFromId(input.tx.methodId.toBigInt());

    if (methodDescriptors === undefined || method === undefined) {
      throw new Error(`MethodId not found ${input.tx.methodId.toString()}`);
    }

    const [moduleName, methodName] = methodDescriptors;

    const parameterEncoder = MethodParameterEncoder.fromMethod(
      this.runtime.resolve(moduleName),
      methodName
    );
    const decodedArguments = await parameterEncoder.decode(input.tx.argsJSON);

    const prefilledStateService = new PreFilledStateService(input.state);
    this.runtime.stateServiceProvider.setCurrentStateService(
      prefilledStateService
    );

    // Set network state and transaction for the runtimemodule to access
    const { transaction, signature } = input.tx.toProtocolTransaction();
    const contextInputs = {
      networkState: input.networkState,
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
    await this.runtimeZkProgrammable.compile();
  }
}
