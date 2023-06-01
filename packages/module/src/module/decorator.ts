import { injectable } from "tsyringe";

import { RuntimeModule } from "../runtime/RuntimeModule.js";
import { TypedClassType } from "@yab/protocol";

export interface AnyConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): any;
}

export const isRuntimeModulePropertyKey = "isRuntimeModule";

/**
 * Marks the decorated class as a runtime module, while also
 * making it injectable with our dependency injection solution.
 */
export function runtimeModule() {
  return (target: TypedClassType<RuntimeModule<unknown>>) => {
    if (!(target.prototype instanceof RuntimeModule)) {
      throw new TypeError(
        `Error applying @runtimeModule() to ${target.name}, did you forget to extend RuntimeModule?`
      );
    }
    injectable()(target);

    Object.defineProperty(target, isRuntimeModulePropertyKey, {
      value: true,
    });
  };
}

/**
 * Checks if the given class/constructor has been marked as a runtime module
 * @param target
 */
export function isRuntimeModule(target: AnyConstructor) {
  return (
    Object.getOwnPropertyDescriptor(target, isRuntimeModulePropertyKey)
      ?.value === true
  );
}
