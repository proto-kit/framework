import { injectable, singleton } from "tsyringe";
import { CompileArtifact, TypedClass, log } from "@proto-kit/common";
import { Field, SmartContract } from "o1js";

export type ContractCompileArtifact = {
  verificationKey: { data: string; hash: Field };
};

@injectable()
@singleton()
export class CompileRegistry {
  private compilationPromises: { [key: string]: Promise<CompileArtifact> } = {};

  private contractCompilationPromises: {
    [key: string]: Promise<ContractCompileArtifact | undefined>;
  } = {};

  private compiledContracts: {
    [key: string]: {
      artifact: ContractCompileArtifact | undefined;
      clas: typeof SmartContract;
    };
  } = {};

  public getContractVerificationKey(
    name: string
  ): ContractCompileArtifact | undefined {
    return this.compiledContracts[name]?.artifact;
  }

  // Use only the compile interface here, to avoid type issues
  public async compile(
    name: string,
    zkProgram: { compile: () => Promise<CompileArtifact> }
  ) {
    if (this.compilationPromises[name] === undefined) {
      log.info(`Compiling ${name}`);
      this.compilationPromises[name] = zkProgram.compile();
    }
    await this.compilationPromises[name];
  }

  public async compileSmartContract(
    name: string,
    contract: typeof SmartContract & {
      compile: () => Promise<ContractCompileArtifact>;
    },
    proofsEnabled: boolean = true
  ) {
    if (this.contractCompilationPromises[name] === undefined) {
      if (proofsEnabled) {
        this.contractCompilationPromises[name] = contract.compile();
      } else {
        this.contractCompilationPromises[name] = Promise.resolve(undefined);
      }
    }
    const artifact = await this.contractCompilationPromises[name];
    this.compiledContracts[name] = {
      artifact,
      clas: contract,
    };
  }

  private isSubtypeOfName(clas: TypedClass<unknown>, name: string): boolean {
    if (clas.name === name) {
      return true;
    }
    if (clas.name === "SmartContract") {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.isSubtypeOfName(Object.getPrototypeOf(clas), name);
  }

  public getContractClassByName(
    name: string
  ): typeof SmartContract | undefined {
    const clas = this.compiledContracts[name]?.clas;
    if (clas === undefined) {
      // Fall back to finding by class.name
      return Object.values(this.compiledContracts).find((entry) =>
        this.isSubtypeOfName(entry.clas, name)
      )?.clas;
    }
    return clas;
  }
}
