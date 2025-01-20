import { inject, injectable, singleton } from "tsyringe";

import { AreProofsEnabled } from "../zkProgrammable/ZkProgrammable";

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

  // TODO Add possibility to force recompilation for non-sideloaded dependencies

  public async compile(target: CompileTarget) {
    if (this.artifacts[target.name] === undefined) {
      const artifact = await this.compiler.compileContract(target);
      this.artifacts[target.name] = artifact;
      return artifact;
    }
    return this.artifacts[target.name];
  }

  public getArtifact(name: string) {
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
