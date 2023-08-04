import { injectable } from "tsyringe";
import { StaticConfigurableModule, TypedClass } from "@proto-kit/common";

import { RuntimeModule } from "../runtime/RuntimeModule.js";

/**
 * Marks the decorated class as a runtime module, while also
 * making it injectable with our dependency injection solution.
 */
export function runtimeModule() {
  return (
    /**
     * Check if the target class extends RuntimeModule, while
     * also providing static config presets
     */
    target: StaticConfigurableModule<unknown> &
      TypedClass<RuntimeModule<unknown>>
  ) => {
    injectable()(target);
  };
}
