import { injectable, singleton } from "tsyringe";
import { CompileArtifact, log } from "@proto-kit/common";

export type ContractCompileArtifact = Record<string, CompileArtifact>;

/**
 * The CompileRegistry compiles "compilable modules"
 * (i.e. zkprograms, contracts or contractmodules)
 * while making sure they don't get compiled twice in the same process in parallel.
 */
@injectable()
@singleton()
export class CompileRegistry {
  private compilationPromises: {
    [key: string]: Promise<CompileArtifact | ContractCompileArtifact>;
  } = {};

  // Use only the compile interface here, to avoid type issues
  public async compile(
    name: string,
    zkProgram: { compile: () => Promise<CompileArtifact> }
  ) {
    if (this.compilationPromises[name] === undefined) {
      log.time(`Compiling ${name}`);
      this.compilationPromises[name] = zkProgram.compile();
      log.timeEnd.info(`Compiling ${name}`);
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (await this.compilationPromises[name]) as CompileArtifact;
  }

  public async compileSmartContract(
    name: string,
    contract: {
      compile: () => Promise<ContractCompileArtifact>;
    },
    proofsEnabled: boolean = true
  ) {
    if (this.compilationPromises[name] === undefined) {
      if (proofsEnabled) {
        log.time(`Compiling ${name}`);
        this.compilationPromises[name] = contract.compile();
        log.timeEnd.info(`Compiling ${name}`);
      } else {
        this.compilationPromises[name] = Promise.resolve({});
      }
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (await this.compilationPromises[name]) as ContractCompileArtifact;
  }
}
