import {
  dependency, dependencyFactory,
  DependencyFactory
} from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { MethodIdResolver } from "../runtime/MethodIdResolver";
import type { Runtime, RuntimeModulesRecord } from "../runtime/Runtime";

@dependencyFactory()
export class MethodIdFactory extends DependencyFactory {
  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>
  ) {
    super();
  }

  @dependency()
  public methodIdResolver(): MethodIdResolver {
    return new MethodIdResolver(this.runtime, this.runtime.definition.modules);
  }
}
