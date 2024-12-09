import type { CompileRegistry } from "./CompileRegistry";
import type { ArtifactRecord } from "./AtomicCompileHelper";

export interface CompilableModule {
  compile(registry: CompileRegistry): Promise<ArtifactRecord | void>;
}
