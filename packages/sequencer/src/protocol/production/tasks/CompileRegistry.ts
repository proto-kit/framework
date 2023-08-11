import { injectable, singleton } from "tsyringe";
import { CompileArtifact } from "@proto-kit/common";

@injectable()
@singleton()
export class CompileRegistry {
  private compilationPromises: { [key: string]: Promise<CompileArtifact> } = {};

  // Use only the compile interface here, to avoid type issues
  public async compile(
    name: string,
    zkProgram: { compile: () => Promise<CompileArtifact> }
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.compilationPromises[name] === undefined) {
      this.compilationPromises[name] = zkProgram.compile();
    }
    // eslint-disable-next-line putout/putout
    await this.compilationPromises[name];
  }
}
