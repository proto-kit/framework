/* eslint-disable import/no-unused-modules */
import { injectable } from 'tsyringe';

// eslint-disable-next-line import/no-cycle
import { RuntimeModule } from '../runtime/RuntimeModule.js';

export interface AnyConstructor {
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/prefer-function-type, @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-readonly-parameter-types
  new (...args: any[]): any;
}

export const isRuntimeModulePropertyKey = 'isRuntimeModule';

export function runtimeModule() {
  return (target: AnyConstructor) => {
    // eslint-disable-next-line max-len, no-warning-comments
    // TODO: is there a way to enforce that runtimeModule can only be applied to RuntimeModule classes?
    if (!(target.prototype instanceof RuntimeModule)) {
      throw new TypeError(
        `Error applying @runtimeModule() to ${target.name}, did you forget to extend RuntimeModule?`
      );
    }
    injectable()(target);

    Object.defineProperty(target, isRuntimeModulePropertyKey, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      value: true,
    });
  };
}

export function isRuntimeModule(target: AnyConstructor) {
  return (
    Object.getOwnPropertyDescriptor(target, isRuntimeModulePropertyKey)
      ?.value === true
  );
}
