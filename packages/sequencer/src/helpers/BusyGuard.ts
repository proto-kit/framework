import { log } from "@proto-kit/common";
/**
 * Decorator that ensures a function/method is not currently in use.
 * Mostly useful for production of blocks, batches and tasks.
 */
export function ensureNotBusy() {
  return function InnerFunction(
    target: object,
    methodName: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>
  ) {
    const originalMethod = descriptor.value!;

    // eslint-disable-next-line consistent-return
    descriptor.value = async function value(
      this: { inProgress: boolean },
      ...args: any[]
    ) {
      if (this.inProgress === true) {
        log.info(`${methodName.toString()} is in use at the moment.`);
        return undefined;
      }

      this.inProgress = true;
      try {
        return await originalMethod.apply(this, args);
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw error;
        } else {
          log.error(error);
        }
      } finally {
        this.inProgress = false;
      }
    };
  };
}
