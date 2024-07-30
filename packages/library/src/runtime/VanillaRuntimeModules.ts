import { RuntimeModulesRecord, RuntimeModule } from "@proto-kit/module";
import { TypedClass, ModulesConfig } from "@proto-kit/common";

import { Balances, MinimalBalances } from "./Balances";

export type VanillaRuntimeModulesRecord = {
  Balances: TypedClass<MinimalBalances & RuntimeModule>;
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

  public static defaultConfig() {
    return {
      Balances: {},
    } satisfies ModulesConfig<VanillaRuntimeModulesRecord>;
  }
}
