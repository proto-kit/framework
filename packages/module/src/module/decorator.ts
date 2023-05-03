/* eslint-disable import/no-unused-modules */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/prefer-default-export */
import { injectable, container, registry } from 'tsyringe';
import { RuntimeModule } from '../runtime/RuntimeModule';

export type AnyConstructor = Parameters<ReturnType<typeof injectable>>[0];

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
