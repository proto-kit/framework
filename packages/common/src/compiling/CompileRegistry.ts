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
  public async forceProverExists<R>(
    f: (registry: CompileRegistry) => Promise<R>
  ): Promise<R> {
    this.inForceProverBlock = true;
    const result = await f(this);
    this.inForceProverBlock = false;
    return result;
  }

  public async compile(target: CompileTarget, nameOverride?: string) {
    const name = nameOverride ?? target.name;
    if (this.artifacts[name] === undefined || this.inForceProverBlock) {
      const artifact = await this.compiler.compileContract(target);
      this.artifacts[name] = artifact;
      return artifact;
    }
    return this.artifacts[name];
  }

  public getArtifact(name: string): CompileArtifact | undefined {
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
