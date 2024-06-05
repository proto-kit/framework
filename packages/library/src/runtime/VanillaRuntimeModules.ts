import { RuntimeModulesRecord } from "@proto-kit/module";
import { TypedClass } from "@proto-kit/common";

import { Balances, MinimalBalances } from "./Balances";

export type VanillaRuntimeModulesRecord = {
  Balances: TypedClass<MinimalBalances>;
};

export class VanillaRuntimeModules {
  public static with<RuntimeModules extends RuntimeModulesRecord>(
    additionalModules: RuntimeModules
  ) {
    return {
      Balances,
      ...additionalModules,
    } satisfies VanillaRuntimeModulesRecord;
  }
}
