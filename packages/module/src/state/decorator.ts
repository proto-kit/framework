import { Path } from "@yab/protocol";

import type { RuntimeModule } from "../runtime/RuntimeModule.js";

import type { State } from "./State.js";

const errors = {
  missingName: (className: string) =>
    new Error(
      `Unable to provide a unique identifier for state, ${className} is missing a name. 
      Did you forget to extend your runtime module with 'extends RuntimeModule'?`
    ),

  missingChain: (className: string) =>
    new Error(
      `Unable to provide 'chain' for state, ${className} is missing a name. 
      Did you forget to extend your runtime module with 'extends RuntimeModule'?`
    ),
};

/**
 * Decorates a runtime module property as state, passing down some
 * underlying values to improve developer experience.
 */
export function state() {
  return (target: RuntimeModule<unknown>, propertyKey: string) => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let value: State<unknown> | undefined;

    Object.defineProperty(target, propertyKey, {
      get: function get() {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const self = this as RuntimeModule<unknown>;

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!self.name) {
          throw errors.missingName(self.constructor.name);
        }

        if (!self.chain) {
          throw errors.missingChain(self.constructor.name);
        }

        const path = Path.fromProperty(self.name, propertyKey);
        if (value) {
          value.path = path;
          // eslint-disable-next-line no-warning-comments
          // TODO: why is this complaining about `any`?

          value.chain = self.chain;
        }
        return value;
      },

      set: (newValue: State<unknown>) => {
        value = newValue;
      },
    });
  };
}
