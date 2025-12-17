import { TypedClass } from "@proto-kit/common";
import { SmartContract } from "o1js";

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
      ? Contract & SmartContract
      : never
    : never;

export type GetContracts<SettlementModules extends SettlementModulesRecord> = {
  [Key in keyof SettlementModules]: SmartContractClassFromInterface<
    InferContractType<SettlementModules[Key]>
  >;
};
