import { injectable, Lifecycle, scoped } from "tsyringe";

import { CompileRegistry } from "../CompileRegistry";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class ChildVerificationKeyService {
  private compileRegistry?: CompileRegistry;

  public setCompileRegistry(registry: CompileRegistry) {
    this.compileRegistry = registry;
  }

  public getVerificationKey(name: string) {
    if (this.compileRegistry === undefined) {
      throw new Error("CompileRegistry hasn't been set yet");
    }
    const artifact = this.compileRegistry.getArtifact(name);
    if (artifact === undefined) {
      throw new Error(
        `Verification Key for child program ${name} not found in registry`
      );
    }
    return artifact.verificationKey;
  }
}
