import { injectable, singleton } from "tsyringe";

import { CompileArtifact } from "../zkProgrammable/ZkProgrammable";

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
  public constructor(private readonly compiler: AtomicCompileHelper) {}

  private artifacts: ArtifactRecord = {};

  private proverMode: "sideloaded" | "baked" | "unset" = "unset";

  /**
   * This function forces compilation even if the artifact itself is in the registry.
   * Basically the statement is: The artifact along is not enough, we need to
   * actually have the prover compiled.
   * This is true for non-sideloaded circuit dependencies.
   */
  public async proverNeeded<R>(
    f: (registry: CompileRegistry) => Promise<R>
  ): Promise<R> {
    if (this.proverMode === "unset") {
      this.proverMode = "baked";

      const result = await f(this);

      this.proverMode = "unset";
      return result;
    } else {
      return await f(this);
    }
  }

  public async sideloaded<R>(
    f: (registry: CompileRegistry) => Promise<R>
  ): Promise<R> {
    const previous = this.proverMode;
    this.proverMode = "sideloaded";
    const result = await f(this);
    this.proverMode = previous;
    return result;
  }

  public async compile(
    target: CompileTarget,
    nameOverride?: string
  ): Promise<CompileArtifact> {
    const name = nameOverride ?? target.name;
    if (this.artifacts[name] === undefined || this.proverMode === "baked") {
      const artifact = await this.compiler.compileContract(target);
      this.artifacts[name] = artifact;
      return artifact;
    } else if (this.proverMode === "unset") {
      // TODO Maybe think about relaxing this requirement and "assume" provers are needed by default
      throw new Error(
        "Please call compile only inside a previous .proverNeeded or .sideloaded call"
      );
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
