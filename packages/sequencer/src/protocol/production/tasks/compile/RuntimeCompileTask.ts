import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { CompilableModule, CompileRegistry } from "@proto-kit/common";
import { Runtime } from "@proto-kit/module";
import {
  ContractArgsRegistry,
  MandatoryProtocolModulesRecord,
  Protocol,
} from "@proto-kit/protocol";

import { CircuitCompileTask } from "./CircuitCompileTask";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class RuntimeCompileTask extends CircuitCompileTask {
  public name = "compile-runtime";

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>,
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord>,
    compileRegistry: CompileRegistry,
    contractArgsRegistry: ContractArgsRegistry
  ) {
    super(protocol, compileRegistry, contractArgsRegistry);
  }

  public async getTargets(): Promise<CompilableModule[]> {
    return [this.runtime];
  }
}
