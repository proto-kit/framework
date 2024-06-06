import {
  AreProofsEnabled,
  ChildContainerProvider,
  ModuleContainer,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";
import { PublicKey, SmartContract } from "o1js";
import { injectable } from "tsyringe";

import { ProtocolEnvironment } from "../protocol/ProtocolEnvironment";
import { ProtocolModule } from "../protocol/ProtocolModule";

import {
  ContractModule,
  SmartContractClassFromInterface,
} from "./ContractModule";
import { DispatchContractProtocolModule } from "./contracts/DispatchContractProtocolModule";
import { DispatchContractType } from "./contracts/DispatchSmartContract";
import {
  SettlementContractConfig,
  SettlementContractProtocolModule,
} from "./contracts/SettlementContractProtocolModule";
import { SettlementContractType } from "./contracts/SettlementSmartContract";

export type SettlementModulesRecord = ModulesRecord<
  TypedClass<ContractModule<unknown, unknown, unknown>>
>;

export type MandatorySettlementModulesRecord = {
  SettlementContract: TypedClass<
    ContractModule<
      SettlementContractType,
      SmartContractClassFromInterface<DispatchContractType>,
      SettlementContractConfig
    >
  >;
  DispatchContract: TypedClass<
    ContractModule<DispatchContractType, unknown, unknown>
  >;
};

@injectable()
export class SettlementContractModule<
    SettlementModules extends SettlementModulesRecord &
      MandatorySettlementModulesRecord,
  >
  extends ModuleContainer<SettlementModules>
  implements ProtocolModule<unknown>
{
  public constructor(definition: { modules: SettlementModules }) {
    super(definition);
  }

  public static from<
    SettlementModules extends SettlementModulesRecord &
      MandatorySettlementModulesRecord,
  >(
    modules: SettlementModules
  ): TypedClass<SettlementContractModule<SettlementModules>> {
    return class ScopedSettlementContractModule extends SettlementContractModule<SettlementModules> {
      public constructor() {
        super({ modules });
      }
    };
  }

  public static fromDefaults() {
    return SettlementContractModule.from({
      SettlementContract: SettlementContractProtocolModule,
      DispatchContract: DispatchContractProtocolModule,
    });
  }

  // ** For protocol module
  public protocol?: ProtocolEnvironment;

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.getAreProofsEnabled();
  }
  // **

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);
  }

  // private assertIsKeyofModules

  public getContractClasses(): {
    settlement: SmartContractClassFromInterface<SettlementContractType>;
    dispatch: SmartContractClassFromInterface<DispatchContractType>;
  } {
    const settlementContractKey = "SettlementContract";
    const dispatchContractKey = "DispatchContract";
    this.assertIsValidModuleName(settlementContractKey);
    this.assertIsValidModuleName(dispatchContractKey);

    const settlementModule = this.resolve(settlementContractKey);
    const dispatchModule = this.resolve(dispatchContractKey);

    const dispatch = dispatchModule.contractFactory(undefined);
    const settlement = settlementModule.contractFactory(dispatch);

    return {
      settlement,
      dispatch,
    };
  }

  public createContracts(addresses: {
    settlement: PublicKey;
    dispatch: PublicKey;
  }): {
    settlement: SettlementContractType & SmartContract;
    dispatch: DispatchContractType & SmartContract;
  } {
    const { dispatch, settlement } = this.getContractClasses();

    // eslint-disable-next-line new-cap
    const dispatchInstance = new dispatch(addresses.dispatch);
    // eslint-disable-next-line new-cap
    const settlementInstance = new settlement(addresses.settlement);

    return {
      dispatch: dispatchInstance,
      settlement: settlementInstance,
    };
  }
}
