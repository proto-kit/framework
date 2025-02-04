import snakeCase from "lodash/snakeCase";

import { Tracer } from "./Tracer";

type Attributes = Record<string, string | number | boolean>;

export function trace<P extends any[], R>(
  name?: string,
  metadata?: ((p: P /*, r: R*/) => Attributes) | Attributes
) {
  return (
    target: { tracer: Tracer },
    methodName: string,
    descriptor: TypedPropertyDescriptor<(...args: P) => Promise<R>>
  ) => {
    const originalMethod = descriptor.value!;

    descriptor.value = async function replaced(
      this: { tracer: Tracer },
      ...args: P
    ) {
      const metadataRecord =
        typeof metadata === "function" ? metadata(args) : metadata;
      return await this.tracer.trace(
        name ?? snakeCase(methodName),
        async () => {
          return await originalMethod.bind(this)(...args);
        },
        metadataRecord ?? {}
      );
    };
  };
}
