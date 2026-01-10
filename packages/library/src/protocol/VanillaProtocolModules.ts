import {
  MandatoryProtocolModulesRecord,
  ProtocolModulesRecord,
  Protocol,
} from "@proto-kit/protocol";
import { PrivateKey } from "o1js";

import { TransactionFeeHook } from "../hooks/TransactionFeeHook";

export type VanillaProtocolModulesRecord = MandatoryProtocolModulesRecord & {
  TransactionFee: typeof TransactionFeeHook;
};

export class VanillaProtocolModules {
  public static mandatoryModules<ProtocolModules extends ProtocolModulesRecord>(
    additionalModules: ProtocolModules
  ): MandatoryProtocolModulesRecord & ProtocolModules {
    return {
      ...Protocol.defaultModules(),
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

  public static mandatoryConfig() {
    return {
      ...Protocol.defaultConfig(),
    };
  }

  public static defaultConfig() {
    return {
      ...VanillaProtocolModules.mandatoryConfig(),
      TransactionFee: {
        tokenId: 0n,
        feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
        baseFee: 0n,
        perWeightUnitFee: 0n,
        methods: {},
      },
    };
  }
}
