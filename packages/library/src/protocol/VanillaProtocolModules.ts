import {
  AccountStateHook,
  BlockHeightHook,
  BlockProver,
  MandatoryProtocolModulesRecord,
  ProtocolModulesRecord,
  StateTransitionProver,
  LastStateRootBlockHook,
} from "@proto-kit/protocol";

import { TransactionFeeHook } from "../hooks/TransactionFeeHook";

export type VanillaProtocolModulesRecord = MandatoryProtocolModulesRecord & {
  TransactionFee: typeof TransactionFeeHook;
};

export class VanillaProtocolModules {
  public static mandatoryModules<ProtocolModules extends ProtocolModulesRecord>(
    additionalModules: ProtocolModules
  ): MandatoryProtocolModulesRecord & ProtocolModules {
    return {
      StateTransitionProver,
      BlockProver,
      AccountState: AccountStateHook,
      BlockHeight: BlockHeightHook,
      LastStateRoot: LastStateRootBlockHook,
      ...additionalModules,
    };
  }

  public static with<ProtocolModules extends ProtocolModulesRecord>(
    additionalModules: ProtocolModules
  ): VanillaProtocolModulesRecord & ProtocolModules {
    return {
      ...VanillaProtocolModules.mandatoryModules(additionalModules),
      TransactionFee: TransactionFeeHook,
    };
  }
}
