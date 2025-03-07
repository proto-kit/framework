import { injectable, singleton, container } from "tsyringe";
import { log } from "@proto-kit/common";

import { Tracer } from "./Tracer";

type StoreType = Record<string, { startTime: number; duration: number }[]>;

@singleton()
export class TraceRecordHolder {
  public store: StoreType = {};
}

@injectable()
export class ConsoleTracer implements Tracer {
  // Hard-code this for the moment. Needs to be configured.
  timeInterval: number = 8000;

  public async trace<T>(
    name: string,
    f: () => Promise<T>,
    metadata?: Record<string, string | number | boolean>
  ): Promise<T> {
    const store = container.resolve(TraceRecordHolder);
    const methodsAlreadyLogged = Object.keys(store.store);

    // We checked the record to see if any methods have exceeded the configured interval.
    // If so we print them and then delete from the record.
    // We look at the first element in the array only (i.e. the first invocation of the function)
    // as this should be enough.
    methodsAlreadyLogged.forEach((methodName) => {
      if (
        Date.now() - store.store[methodName][0].startTime >
        this.timeInterval
      ) {
        const sumTime = store.store[methodName].reduce((result, curr) => {
          return result + curr.duration;
        }, 0);
        const numberOfCalls = store.store[methodName].length;
        const message = `Routine ${methodName}: executed ${numberOfCalls} times, average ${sumTime / numberOfCalls}ms`;
        log.debug(message);
        delete store.store[methodName];
      }
    });

    const startTime = Date.now();
    const result = await f();
    const duration = Date.now() - startTime;
    if (name in store.store) {
      store.store[name].push({ startTime, duration });
    } else {
      store.store[name] = [{ startTime, duration }];
    }
    return result;
  }
}
