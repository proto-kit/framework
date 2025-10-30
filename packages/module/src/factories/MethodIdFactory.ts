import { DependencyFactory, DependencyRecord } from "@proto-kit/common";

import { MethodIdResolver } from "../runtime/MethodIdResolver";

export class MethodIdFactory {
  public static dependencies() {
    return {
      methodIdResolver: {
        useClass: MethodIdResolver,
      },
    } satisfies DependencyRecord;
  }
}

MethodIdFactory satisfies DependencyFactory;
