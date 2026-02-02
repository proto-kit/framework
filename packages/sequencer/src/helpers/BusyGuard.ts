import { log } from "@proto-kit/common";
/**
 * Decorator that ensures a function/method is not currently in use.
 * Mostly useful for production of blocks, batches and tasks.
 */
export function ensureNotBusy<T>() {
  return function innerFunction<R>(
    _target: T,
    methodName: string,
    descriptor: TypedPropertyDescriptor<
      (...args: any[]) => Promise<R | undefined>
    >
  ): void {
    let inProgress = false;

    const originalMethod = descriptor.value!;

    descriptor.value = async function wrapped(this: T, ...args: unknown[]) {
      if (inProgress) {
        log.trace(`${methodName} is in use at the moment, skipping execution.`);
        return undefined;
      }

      inProgress = true;
      try {
        return await originalMethod.apply(this, args);
      } finally {
        inProgress = false;
      }
    };
  };
}
