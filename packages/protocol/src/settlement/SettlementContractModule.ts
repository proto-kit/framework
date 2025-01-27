import {
  AreProofsEnabled,
  ChildContainerProvider,
  ModuleContainer,
  ModulesRecord,
  TypedClass,
  noop,
} from "@proto-kit/common";
import { Field, PublicKey, SmartContract } from "o1js";
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
import { BridgeContractType } from "./contracts/BridgeContract";
import {
  BridgeContractConfig,
  BridgeContractProtocolModule,
} from "./contracts/BridgeContractProtocolModule";

export type SettlementModulesRecord = ModulesRecord<
  TypedClass<ContractModule<unknown, unknown>>
>;

export type MandatorySettlementModulesRecord = {
  SettlementContract: TypedClass<
    ContractModule<SettlementContractType, SettlementContractConfig>
  >;
  DispatchContract: TypedClass<ContractModule<DispatchContractType, unknown>>;
  BridgeContract: TypedClass<
    ContractModule<BridgeContractType, BridgeContractConfig>
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

  public static mandatoryModules() {
    return {
      SettlementContract: SettlementContractProtocolModule,
      DispatchContract: DispatchContractProtocolModule,
      BridgeContract: BridgeContractProtocolModule,
    } as const;
  }

  public static fromDefaults() {
    return SettlementContractModule.from(
      SettlementContractModule.mandatoryModules()
    );
  }

  public static with<AdditionalModules extends SettlementModulesRecord>(
    additionalModules: AdditionalModules
  ) {
    return SettlementContractModule.from({
      ...SettlementContractModule.mandatoryModules(),
      ...additionalModules,
    } as const);
  }

  // ** For protocol module
  public protocol?: ProtocolEnvironment;

  public get areProofsEnabled(): AreProofsEnabled | undefined {
    return this.protocol?.getAreProofsEnabled();
  }
  // **

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);
  }

  public async start() {
    noop();
  }

  public getContractClasses(): {
    settlement: SmartContractClassFromInterface<SettlementContractType>;
    dispatch: SmartContractClassFromInterface<DispatchContractType>;
    bridge: SmartContractClassFromInterface<BridgeContractType>;
  } {
    // TODO Make that dynamic
    const settlementContractKey = "SettlementContract";
    const dispatchContractKey = "DispatchContract";
    const bridgeContractKey = "BridgeContract";
    this.assertIsValidModuleName(settlementContractKey);
    this.assertIsValidModuleName(dispatchContractKey);
    this.assertIsValidModuleName(bridgeContractKey);

    const settlementModule = this.resolve(settlementContractKey);
    const dispatchModule = this.resolve(dispatchContractKey);
    const bridgeModule = this.resolve(bridgeContractKey);

    const dispatch = dispatchModule.contractFactory();
    const bridge = bridgeModule.contractFactory();
    const settlement = settlementModule.contractFactory();

    return {
      settlement,
      dispatch,
      bridge,
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

  public createBridgeContract(
    address: PublicKey,
    tokenId?: Field
  ): BridgeContractType & SmartContract {
    const { bridge } = this.getContractClasses();

    // eslint-disable-next-line new-cap
    return new bridge(address, tokenId);
  }
}
