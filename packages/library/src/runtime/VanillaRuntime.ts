/* eslint-disable import/no-unused-modules */
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { TypedClass } from "packages/common/dist";
import { Balances } from "./Balances";

export const VanillaRuntime = {
  from<RuntimeModules extends RuntimeModulesRecord>(
    additionalModules: RuntimeModules
  ): TypedClass<Runtime<RuntimeModules & { Balances: typeof Balances }>> {
    return Runtime.from<RuntimeModules & { Balances: typeof Balances }>({
      modules: {
        ...additionalModules,
        Balances,
      },
    });
  },
};
