import { injectable, singleton } from "tsyringe";
import { CompileArtifact } from "@proto-kit/common";
import { SmartContract } from "o1js";

type ContractCompileArtifactPromise = ReturnType<typeof SmartContract.compile>;

@injectable()
@singleton()
export class CompileRegistry {
  private compilationPromises: { [key: string]: Promise<CompileArtifact> } = {};

  private contractCompilationPromises: {
    [key: string]: ContractCompileArtifactPromise;
  } = {};

  // Use only the compile interface here, to avoid type issues
  public async compile(
    name: string,
    zkProgram: { compile: () => Promise<CompileArtifact> }
  ) {
    if (this.compilationPromises[name] === undefined) {
      this.compilationPromises[name] = zkProgram.compile();
    }
    // eslint-disable-next-line putout/putout
    await this.compilationPromises[name];
  }

  public async compileSmartContract(
    name: string,
    contract: { compile: () => ContractCompileArtifactPromise }
  ) {
    if (this.contractCompilationPromises[name] === undefined) {
      this.contractCompilationPromises[name] = contract.compile();
    }
    // eslint-disable-next-line putout/putout
    await this.contractCompilationPromises[name];
  }
}
