import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Task } from "../../../worker/flow/Task";
import { RuntimeProofParameters, RuntimeProofParametersSerializer } from "./RuntimeTaskParameters";
import { MethodParameterDecoder, Runtime, RuntimeMethodExecutionContext } from "@proto-kit/module";
import { TaskSerializer } from "../../../worker/manager/ReducableTask";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { PreFilledStateService } from "./providers/PreFilledStateService";
import { MethodPublicOutput, RuntimeTransaction } from "@proto-kit/protocol";
import { Proof } from "snarkyjs";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class RuntimeProvingTask
  implements Task<RuntimeProofParameters, RuntimeProof>
{
  protected readonly runtimeZkProgrammable =
    this.runtime.zkProgrammable.zkProgram;

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>,
    private readonly executionContext: RuntimeMethodExecutionContext
  ) {}

  public inputSerializer(): TaskSerializer<RuntimeProofParameters> {
    return new RuntimeProofParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<RuntimeProof> {
    return new ProofTaskSerializer(this.runtimeZkProgrammable.Proof);
  }

  public name = "runtimeProof";

  public async compute(input: RuntimeProofParameters): Promise<RuntimeProof> {
    const method = this.runtime.getMethodById(input.tx.methodId.toBigInt());

    const [moduleName, methodName] = this.runtime.getMethodNameFromId(
      input.tx.methodId.toBigInt()
    );

    const parameterDecoder = MethodParameterDecoder.fromMethod(
      this.runtime.resolve(moduleName),
      methodName
    );
    const decodedArguments = parameterDecoder.fromFields(input.tx.args);

    const prefilledStateService = new PreFilledStateService(input.state);
    this.runtime.stateServiceProvider.setCurrentStateService(
      prefilledStateService
    );

    // Set network state and transaction for the runtimemodule to access
    const runtimeTransaction = RuntimeTransaction.fromProtocolTransaction(
      input.tx.toProtocolTransaction()
    );
    const contextInputs = {
      networkState: input.networkState,
      transaction: runtimeTransaction,
    };
    this.executionContext.setup(contextInputs);

    method(...decodedArguments);
    const { result } = this.executionContext.current();

    this.executionContext.setup(contextInputs);
    const proof = await result.prove<RuntimeProof>();

    this.runtime.stateServiceProvider.resetToDefault();
    return proof;
  }

  public async prepare(): Promise<void> {
    await this.runtimeZkProgrammable.compile();
  }
}
