/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { container } from 'tsyringe';

import type { RuntimeModule } from '../runtime/RuntimeModule.js';

import { MethodExecutionContext } from './MethodExecutionContext.js';

export function method() {
  return (
    target: RuntimeModule,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalFunction = descriptor.value;
    descriptor.value = function value(this: RuntimeModule, ...args: []) {
      const executionContext = container.resolve<
        MethodExecutionContext<ReturnType<typeof originalFunction>>
      >(MethodExecutionContext);

      // eslint-disable-next-line @typescript-eslint/init-declarations
      let resultValue: unknown;

      executionContext.beforeMethod(propertyKey);
      try {
        resultValue = originalFunction.apply(this, args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        throw new Error(error);
      } finally {
        executionContext.afterMethod();
      }

      return resultValue;
    };
  };
}
