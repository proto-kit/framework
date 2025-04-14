import { DependencyRecord } from "@proto-kit/common";

import { ConsoleTracer } from "./ConsoleTracer";

export class ConsoleLoggingFactory {
  public static dependencies() {
    return {
      Tracer: {
        useClass: ConsoleTracer,
      },
    } satisfies DependencyRecord;
  }
}
