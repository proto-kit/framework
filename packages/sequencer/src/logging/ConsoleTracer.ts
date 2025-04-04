import { injectable } from "tsyringe";
import { log } from "@proto-kit/common";

import { Tracer } from "./Tracer";

@injectable()
export class ConsoleTracer implements Tracer {
  public async trace<T>(
    name: string,
    f: () => Promise<T>,
    metadata?: Record<string, string | number | boolean>
  ): Promise<T> {
    const timeStart = Date.now();
    const result = await f();
    const message = `Routine ${name} took ${Date.now() - timeStart}ms`;
    if (metadata !== undefined) {
      log.debug(message, metadata);
    } else {
      log.debug(message);
    }
    return result;
  }
}
