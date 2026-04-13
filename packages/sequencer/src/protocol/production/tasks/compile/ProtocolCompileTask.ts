import { inject, injectable } from "tsyringe";
import { CompilableModule, CompileRegistry } from "@proto-kit/common";
import {
  ContractArgsRegistry,
  MandatoryProtocolModulesRecord,
  Protocol,
} from "@proto-kit/protocol";

import { task } from "../../../../worker/worker/TaskWorkerModule";

import { CircuitCompileTask } from "./CircuitCompileTask";

@injectable()
export class ProtocolCompileTask extends CircuitCompileTask {
  public name = "undefined";

  public constructor(
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord>,
    compileRegistry: CompileRegistry,
    contractArgsRegistry: ContractArgsRegistry
  ) {
    super(protocol, compileRegistry, contractArgsRegistry);

    this.name = `compile-${this.getTargetProtocolModule().toLowerCase()}`;
  }

  public getTargetProtocolModule(): string {
    throw new Error("");
  }

  public async getTargets(): Promise<CompilableModule[]> {
    return [this.protocol.resolveOrFail(this.getTargetProtocolModule())];
  }
}

@injectable()
@task()
export class BlockProverCompileTask extends ProtocolCompileTask {
  public getTargetProtocolModule() {
    return "BlockProver";
  }
}

@injectable()
@task()
export class STProverCompileTask extends ProtocolCompileTask {
  public getTargetProtocolModule() {
    return "StateTransitionProver";
  }
}

@injectable()
@task()
export class TransactionProverCompileTask extends ProtocolCompileTask {
  public getTargetProtocolModule() {
    return "TransactionProver";
  }
}
