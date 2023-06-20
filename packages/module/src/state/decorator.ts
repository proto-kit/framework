import { Path } from "@yab/protocol";

import type { RuntimeModule } from "../runtime/RuntimeModule.js";

import type { State } from "./State.js";

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
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let value: State<unknown> | undefined;

    Object.defineProperty(target, propertyKey, {
      get: function get() {
        // eslint-disable-next-line max-len
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
          // eslint-disable-next-line no-warning-comments
          // TODO: why is this complaining about `any`?

          value.runtime = self.runtime;
        }
        return value;
      },

      set: (newValue: State<unknown>) => {
        value = newValue;
      },
    });
  };
}
