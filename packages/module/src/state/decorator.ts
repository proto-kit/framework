/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/no-unused-modules */

import { Path } from '../path/Path.js';
import type { RuntimeModule } from '../runtime/RuntimeModule.js';

import type { State } from './State.js';

export function state() {
  return (target: RuntimeModule, propertyKey: string) => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let value: State<unknown> | undefined;

    Object.defineProperty(target, propertyKey, {
      get: function get() {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const self = this as RuntimeModule;
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!self.name) {
          throw new Error(
            `Unable to provide a unique identifier for state, ${self.constructor.name} is missing a name. Did you forget to extend your runtime module with 'extends RuntimeModule'?`
          );
        }

        const path = Path.fromProperty(self.name, propertyKey);
        if (value) {
          value.path = path;
        }
        return value;
      },

      set: (newValue: State<unknown>) => {
        value = newValue;
      },
    });
  };
}
