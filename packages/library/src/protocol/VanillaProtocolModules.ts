/* eslint-disable import/no-unused-modules */
import { TypedClass } from "@proto-kit/common";
import {
  AccountStateHook,
  BlockHeightHook,
  BlockProver,
  BlockProverType,
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  StateTransitionProver,
  StateTransitionProverType,
  LastStateRootBlockHook,
} from "@proto-kit/protocol";
import { TransactionFeeHook } from "../hooks/TransactionFeeHook";
import { VanillaRuntimeModulesRecord } from "../runtime/VanillaRuntimeModules";

export type VanillaProtocolModulesRecord = MandatoryProtocolModulesRecord & {
  TransactionFee: typeof TransactionFeeHook;
};

export class VanillaProtocolModules {
  public static with<ProtocolModules extends ProtocolModulesRecord>(
    additionalModules: ProtocolModules
  ): VanillaProtocolModulesRecord & ProtocolModules {
    return {
      StateTransitionProver,
      BlockProver,
      AccountState: AccountStateHook,
      BlockHeight: BlockHeightHook,
      TransactionFee: TransactionFeeHook,
      LastStateRoot: LastStateRootBlockHook,
      ...additionalModules,
    };
  }
}
