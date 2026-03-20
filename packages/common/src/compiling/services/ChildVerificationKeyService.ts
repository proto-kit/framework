import { injectable, Lifecycle, scoped } from "tsyringe";
import { Provable } from "o1js";

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

  public getAsConstant(name: string) {
    const vk = this.getVerificationKey(name);
    if (!vk.hash.isConstant()) {
      throw new Error("Sanity check - vk hash has to be constant");
    }
    Provable.log("Vk hash", name, vk.hash, vk.data);
    return vk;
  }
}
