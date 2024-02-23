import { injectable, singleton } from "tsyringe";
import { CompileArtifact } from "@proto-kit/common";
import { Field, SmartContract } from "o1js";

export type ContractCompileArtifact = { verificationKey: {data: string, hash: Field} };

@injectable()
@singleton()
export class CompileRegistry {
  private compilationPromises: { [key: string]: Promise<CompileArtifact> } = {};

  private contractCompilationPromises: {
    [key: string]: Promise<ContractCompileArtifact>;
  } = {};

  private compiledContracts: {
    [key: string]: ContractCompileArtifact;
  } = {};

  public getContractVerificationKey(
    name: string
  ): ContractCompileArtifact | undefined {
    return this.compiledContracts[name];
  }

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
    contract: { compile: () => Promise<ContractCompileArtifact> }
  ) {
    if (this.contractCompilationPromises[name] === undefined) {
      this.contractCompilationPromises[name] = contract.compile();
    }
    // eslint-disable-next-line putout/putout
    const result = await this.contractCompilationPromises[name];
    this.compiledContracts[name] = result;
  }
}
