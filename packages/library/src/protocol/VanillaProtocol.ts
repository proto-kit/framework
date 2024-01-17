/* eslint-disable import/no-unused-modules */
import { TypedClass } from "@proto-kit/common";
import {
  AccountStateHook,
  BlockHeightHook,
  BlockProver,
  GenericProtocolModuleRecord,
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  StateTransitionProver,
} from "@proto-kit/protocol";
import { TransactionFeeHook } from "../hooks/TransactionFeeHook";

export interface VanillaProtocolModulesRecord extends ProtocolModulesRecord {
  StateTransitionProver: typeof StateTransitionProver;
  BlockProver: typeof BlockProver;
  AccountState: typeof AccountStateHook;
  BlockHeight: typeof BlockHeightHook;
  TransactionFee: typeof TransactionFeeHook;
}

export const VanillaProtocol = {
  create() {
    return VanillaProtocol.from({});
  },

  from<ProtocolModules extends GenericProtocolModuleRecord>(
    additionalModules: Partial<MandatoryProtocolModulesRecord> & ProtocolModules
  ): TypedClass<Protocol<ProtocolModules & VanillaProtocolModulesRecord>> {
    return Protocol.from<ProtocolModules & VanillaProtocolModulesRecord>({
      modules: {
        StateTransitionProver,
        BlockProver,
        AccountState: AccountStateHook,
        BlockHeight: BlockHeightHook,
        TransactionFee: TransactionFeeHook,
        ...additionalModules,
      },
    });
  },
};
