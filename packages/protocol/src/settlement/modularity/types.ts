import { TypedClass } from "@proto-kit/common";

import {
  ContractModule,
  SmartContractClassFromInterface,
} from "../ContractModule";
import type { SettlementModulesRecord } from "../SettlementContractModule";

export type InferContractType<
  Module extends TypedClass<ContractModule<any, any>>,
> =
  Module extends TypedClass<infer ConcreteModule>
    ? ConcreteModule extends ContractModule<infer Contract, any>
      ? Contract
      : never
    : never;

export type GetContracts<SettlementModules extends SettlementModulesRecord> = {
  [Key in keyof SettlementModules]: SmartContractClassFromInterface<
    InferContractType<SettlementModules[Key]>
  >;
};
