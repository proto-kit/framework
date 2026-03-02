import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { CompilableModule, CompileRegistry } from "@proto-kit/common";
import {
  ContractArgsRegistry,
  MandatoryProtocolModulesRecord,
  Protocol,
} from "@proto-kit/protocol";

import { CircuitCompileTask } from "./CircuitCompileTask";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class ProtocolCompileTask extends CircuitCompileTask {
  public name = "compile-protocol";

  public constructor(
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord>,
    compileRegistry: CompileRegistry,
    contractArgsRegistry: ContractArgsRegistry
  ) {
    super(protocol, compileRegistry, contractArgsRegistry);
  }

  public async getTargets(): Promise<CompilableModule[]> {
    return [this.protocol.blockProver];
  }
}
