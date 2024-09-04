import { RuntimeModule, runtimeModule, runtimeMethod } from "@proto-kit/module";
import { noop } from "@proto-kit/common";

@runtimeModule()
export class NoopRuntime extends RuntimeModule {
  @runtimeMethod()
  public async emittingNoSTs() {
    noop();
  }
}
