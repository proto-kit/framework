/* eslint-disable import/no-unused-modules */
import {
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { PublicKey } from "o1js";
import { OverwriteObjectType, TypedClass } from "@proto-kit/common";
import { TokenId } from "../hooks/TransactionFeeHook";
import { Balance, Balances, MinimalBalances } from "./Balances";

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
