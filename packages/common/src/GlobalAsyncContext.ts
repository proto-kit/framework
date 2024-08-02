import { injectable, container } from "tsyringe";

@injectable()
export class GlobalAsyncContext {
  private locked = false;

  public requestLock() {
    if (this.locked) {
      throw new Error("Requested a lock, but already locked");
    }
    this.locked = true;
  }

  public releaseLock() {
    this.locked = false;
  }
}

export async function ensureAwaitedPromise<T>(promise: Promise<T>): Promise<T> {
  const context = container.resolve(GlobalAsyncContext);
  try {
    context.requestLock();
  } catch (e) {
    throw new Error(
      "A previous promise hasn't been awaited, you most likely forgot a 'await' somewhere in your code"
    );
  }
  const result = await promise;
  context.releaseLock();
  return result;
}

export function ensureAwaited(
  target: unknown,
  methodName: string,
  descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>
) {
  const f = descriptor.value!;
  descriptor.value = async (...args: any[]) => {
    return await ensureAwaitedPromise(f(...args));
  };
}
