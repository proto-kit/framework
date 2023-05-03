/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-unused-modules */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { container } from 'tsyringe';
import { RuntimeModule } from '../runtime/RuntimeModule';
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

      let resultValue: unknown;

      executionContext.beforeMethod(propertyKey);
      try {
        resultValue = originalFunction.apply(this, args);
      } catch (error: any) {
        throw new Error(error);
      } finally {
        executionContext.afterMethod();
      }

      return resultValue;
    };
  };
}
