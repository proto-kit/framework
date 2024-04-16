import { Path, State } from "@proto-kit/protocol";

import type { RuntimeModule } from "../runtime/RuntimeModule.js";

const errors = {
  missingName: (className: string) =>
    new Error(
      `Unable to provide a unique identifier for state, ${className} is missing a name. 
      Did you forget to extend your runtime module with 'extends RuntimeModule'?`
    ),

  missingRuntime: (className: string) =>
    new Error(
      `Unable to provide 'runtime' for state, ${className} is missing a name. 
      Did you forget to extend your runtime module with 'extends RuntimeModule'?`
    ),
};

/**
 * Decorates a runtime module property as state, passing down some
 * underlying values to improve developer experience.
 */
export function state() {
  return <TargetRuntimeModule extends RuntimeModule<unknown>>(
    target: TargetRuntimeModule,
    propertyKey: string
  ) => {
    let value: State<unknown> | undefined;

    Object.defineProperty(target, propertyKey, {
      enumerable: true,

      get: function get() {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const self = this as TargetRuntimeModule;

        if (self.name === undefined) {
          throw errors.missingName(self.constructor.name);
        }

        if (!self.runtime) {
          throw errors.missingRuntime(self.constructor.name);
        }

        const path = Path.fromProperty(self.name, propertyKey);
        if (value) {
          value.path = path;

          // TODO: why is this complaining about `any`?

          value.stateServiceProvider = self.runtime.stateServiceProvider;
        }
        return value;
      },

      set: (newValue: State<unknown>) => {
        value = newValue;
      },
    });
  };
}
