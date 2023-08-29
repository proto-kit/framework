import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  Protocol,
  ProtocolConstants,
  ProtocolModulesRecord,
  ProvableStateTransition,
  StateTransitionProof,
  StateTransitionProvable,
  StateTransitionProvableBatch,
  StateTransitionProverPublicOutput,
} from "@proto-kit/protocol";
import { log, ProvableMethodExecutionContext } from "@proto-kit/common";

import { Task } from "../../../worker/flow/Task";
import { TaskSerializer } from "../../../worker/manager/ReducableTask";
import {
  PairProofTaskSerializer,
  PairTuple,
  ProofTaskSerializer,
} from "../../../helpers/utils";

import {
  StateTransitionParametersSerializer,
  StateTransitionProofParameters,
} from "./StateTransitionTaskParameters";
import { PreFilledWitnessProvider } from "./providers/PreFilledWitnessProvider";
import { CompileRegistry } from "./CompileRegistry";
import { Field } from "snarkyjs";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class StateTransitionTask
  implements Task<StateTransitionProofParameters, StateTransitionProof>
{
  protected readonly stateTransitionProver: StateTransitionProvable;

  public name = "stateTransitionProof";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    this.stateTransitionProver = this.protocol.stateTransitionProver;
  }

  public inputSerializer(): TaskSerializer<StateTransitionProofParameters> {
    return new StateTransitionParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(this.stateTransitionProver.zkProgram.Proof);
  }

  public async compute(
    input: StateTransitionProofParameters
  ): Promise<StateTransitionProof> {
    const witnessProvider = new PreFilledWitnessProvider(input.merkleWitnesses);

    const { witnessProviderReference } = this.stateTransitionProver;
    const previousProvider = witnessProviderReference.getWitnessProvider();
    witnessProviderReference.setWitnessProvider(witnessProvider);

    const stBatch = input.batch.slice();
    Array.from({
      length: ProtocolConstants.stateTransitionProverBatchSize - stBatch.length,
    }).forEach(() => {
      stBatch.push(ProvableStateTransition.dummy());
    });

    console.log("Task paths:");
    console.log(stBatch.map(st => ProvableStateTransition.toJSON(st)))
    console.log(input.merkleWitnesses[0].calculateRoot(Field(0)).toString());

    console.log("STTask Input:", input.publicInput.stateRoot.toString());

    const output = this.stateTransitionProver.runBatch(
      input.publicInput,
      StateTransitionProvableBatch.fromTransitions(stBatch)
    );
    log.debug(
      "STTask output:",
      StateTransitionProverPublicOutput.toJSON(output)
    );

    const proof = await this.executionContext
      .current()
      .result.prove<StateTransitionProof>();

    if (previousProvider !== undefined) {
      witnessProviderReference.setWitnessProvider(previousProvider);
    }
    return proof;
  }

  public async prepare(): Promise<void> {
    await this.compileRegistry.compile(
      "StateTransitionProver",
      this.stateTransitionProver.zkProgram
    );
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class StateTransitionReductionTask
  implements Task<PairTuple<StateTransitionProof>, StateTransitionProof>
{
  protected readonly stateTransitionProver: StateTransitionProvable;

  public name = "stateTransitionReduction";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    this.stateTransitionProver = this.protocol.stateTransitionProver;
  }

  public inputSerializer(): TaskSerializer<PairTuple<StateTransitionProof>> {
    return new PairProofTaskSerializer(
      this.stateTransitionProver.zkProgram.Proof
    );
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(this.stateTransitionProver.zkProgram.Proof);
  }

  public async compute(
    input: PairTuple<StateTransitionProof>
  ): Promise<StateTransitionProof> {
    const [r1, r2] = input;
    this.stateTransitionProver.merge(r1.publicInput, r1, r2);
    return await this.executionContext
      .current()
      .result.prove<StateTransitionProof>();
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  public async prepare(): Promise<void> {
    await this.compileRegistry.compile(
      "StateTransitionProver",
      this.stateTransitionProver.zkProgram
    );
  }
}
