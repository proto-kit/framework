import { DependencyFactory, DependencyRecord } from "@proto-kit/common";

import { MethodIdResolver } from "../runtime/MethodIdResolver";

export class MethodIdFactory implements DependencyFactory {
  public dependencies() {
    return {
      methodIdResolver: {
        useClass: MethodIdResolver,
      },
    } satisfies DependencyRecord;
  }
}
