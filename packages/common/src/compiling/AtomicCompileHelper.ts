import {
  AreProofsEnabled,
  CompileArtifact,
  MOCK_VERIFICATION_KEY,
} from "../zkProgrammable/ZkProgrammable";
import { isSubtypeOfName } from "../utils";
import { TypedClass } from "../types";
import { log } from "../log";

export type ArtifactRecord = Record<string, CompileArtifact>;

export type CompileTarget = {
  name: string;
  compile: () => Promise<CompileArtifact>;
};

export class AtomicCompileHelper {
  public constructor(private readonly areProofsEnabled: AreProofsEnabled) {}

  private compilationPromises: {
    [key: string]: Promise<CompileArtifact>;
  } = {};

  public async compileContract(
    contract: CompileTarget,
    overrideProofsEnabled?: boolean
  ): Promise<CompileArtifact> {
    let newPromise = false;
    const { name } = contract;
    if (this.compilationPromises[name] === undefined) {
      const proofsEnabled =
        overrideProofsEnabled ?? this.areProofsEnabled.areProofsEnabled;

      // We only care about proofs enabled here if it's a contract, because
      // in all other cases, ZkProgrammable already handles this switch, and we
      // want to preserve the artifact layout (which might be more than one
      // entry for ZkProgrammables)
      if (
        proofsEnabled ||
        !isSubtypeOfName(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          contract as unknown as TypedClass<any>,
          "SmartContract"
        )
      ) {
        log.time(`Compiling ${name}`);
        this.compilationPromises[name] = contract.compile();
        newPromise = true;
      } else {
        log.trace(`Compiling ${name} - mock`);
        this.compilationPromises[name] = Promise.resolve({
          verificationKey: MOCK_VERIFICATION_KEY,
        });
      }
    }
    const result = await this.compilationPromises[name];
    if (newPromise) {
      log.timeEnd.info(`Compiling ${name}`);
    }
    return result;
  }
}
