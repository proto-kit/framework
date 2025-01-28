import { inject, injectable, singleton } from "tsyringe";

import {
  AreProofsEnabled,
  CompileArtifact,
} from "../zkProgrammable/ZkProgrammable";

import {
  ArtifactRecord,
  AtomicCompileHelper,
  CompileTarget,
} from "./AtomicCompileHelper";

/**
 * The CompileRegistry compiles "compilable modules"
 * (i.e. zkprograms, contracts or contractmodules)
 * while making sure they don't get compiled twice in the same process in parallel.
 */
@injectable()
@singleton()
export class CompileRegistry {
  public constructor(
    @inject("AreProofsEnabled")
    private readonly areProofsEnabled: AreProofsEnabled
  ) {
    this.compiler = new AtomicCompileHelper(this.areProofsEnabled);
  }

  private compiler: AtomicCompileHelper;

  private artifacts: ArtifactRecord = {};

  private inForceProverBlock = false;

  /**
   * This function forces compilation even if the artifact itself is in the registry.
   * Basically the statement is: The artifact along is not enough, we need to
   * actually have the prover compiled.
   * This is true for non-sideloaded circuit dependencies.
   */
  public async forceProverExists(
    f: (registry: CompileRegistry) => Promise<void>
  ) {
    this.inForceProverBlock = true;
    await f(this);
    this.inForceProverBlock = false;
  }

  public async compile(target: CompileTarget) {
    if (this.artifacts[target.name] === undefined || this.inForceProverBlock) {
      const artifact = await this.compiler.compileContract(target);
      this.artifacts[target.name] = artifact;
      return artifact;
    }
    return this.artifacts[target.name];
  }

  public getArtifact(name: string): CompileArtifact | undefined {
    if (this.artifacts[name] === undefined) {
      throw new Error(
        `Artifact for ${name} not available, did you compile it via the CompileRegistry?`
      );
    }

    return this.artifacts[name];
  }

  public addArtifactsRaw(artifacts: ArtifactRecord) {
    this.artifacts = {
      ...this.artifacts,
      ...artifacts,
    };
  }

  public getAllArtifacts() {
    return this.artifacts;
  }
}
