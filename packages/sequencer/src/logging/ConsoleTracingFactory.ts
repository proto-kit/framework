import { DependencyFactory, DependencyRecord } from "@proto-kit/common";

import { ConsoleTracer } from "./ConsoleTracer";

export class ConsoleTracingFactory {
  public static dependencies() {
    return {
      Tracer: {
        useClass: ConsoleTracer,
      },
    } satisfies DependencyRecord;
  }
}

ConsoleTracingFactory satisfies DependencyFactory;
