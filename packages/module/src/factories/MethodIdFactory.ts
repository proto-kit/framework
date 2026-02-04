import { dependencyFactory, DependencyRecord } from "@proto-kit/common";

import { MethodIdResolver } from "../runtime/MethodIdResolver";

@dependencyFactory()
export class MethodIdFactory {
  public static dependencies() {
    return {
      methodIdResolver: {
        useClass: MethodIdResolver,
      },
    } satisfies DependencyRecord;
  }
}
