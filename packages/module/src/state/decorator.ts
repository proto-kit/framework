/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/no-unused-modules */

import { Path } from '../path/Path.js';
import { State } from './State.js';

/* eslint-disable import/prefer-default-export */
export function state(target: object, propertyKey: string) {
  const className = target.constructor.name;
  const path = Path.fromProperty(className, propertyKey);

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let value: State<unknown> | undefined;

  Object.defineProperty(target, propertyKey, {
    get: () => {
      if (value) {
        value.path = path;
      }
      return value;
    },

    set: (newValue: State<unknown>) => {
      value = newValue;
    },
  });
}
