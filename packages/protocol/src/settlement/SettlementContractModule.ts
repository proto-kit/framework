import {
  AreProofsEnabled,
  ChildContainerProvider,
  ModuleContainer,
  ModulesRecord,
  TypedClass,
  noop,
  StringKeyOf,
} from "@proto-kit/common";
import { Field, PublicKey, SmartContract } from "o1js";
import { injectable } from "tsyringe";

import { ProtocolEnvironment } from "../protocol/ProtocolEnvironment";
import { ProtocolModule } from "../protocol/ProtocolModule";

import { ContractModule } from "./ContractModule";
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
import { GetContracts } from "./modularity/types";

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

  public getContractClasses(): GetContracts<SettlementModules> {
    const contracts =
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (this.moduleNames as StringKeyOf<SettlementModules>[]).map((name) => {
        const module = this.resolve(name);
        return [name, module.contractFactory()];
      });
    return Object.fromEntries(contracts);
  }

  public createContracts(addresses: {
    settlement: PublicKey;
    dispatch: PublicKey;
  }): {
    settlement: SettlementContractType & SmartContract;
    dispatch: DispatchContractType & SmartContract;
  } {
    const { DispatchContract, SettlementContract } = this.getContractClasses();

    const dispatchInstance = new DispatchContract(addresses.dispatch);
    const settlementInstance = new SettlementContract(addresses.settlement);

    return {
      dispatch: dispatchInstance,
      settlement: settlementInstance,
    };
  }

  public createBridgeContract(
    address: PublicKey,
    tokenId?: Field
  ): BridgeContractType & SmartContract {
    const { BridgeContract } = this.getContractClasses();

    return new BridgeContract(address, tokenId);
  }
}
