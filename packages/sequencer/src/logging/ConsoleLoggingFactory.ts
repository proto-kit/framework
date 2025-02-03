import { injectable } from "tsyringe";
import { DependencyFactory, DependencyRecord } from "@proto-kit/common";

import { ConsoleTracer } from "./ConsoleTracer";

@injectable()
export class ConsoleLoggingFactory implements DependencyFactory {
  public dependencies() {
    return {
      Tracer: {
        useClass: ConsoleTracer,
      },
    } satisfies DependencyRecord;
  }
}
