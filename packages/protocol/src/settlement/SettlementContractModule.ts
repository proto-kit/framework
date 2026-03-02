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
import { BridgingSettlementContractModule } from "./contracts/BridgingSettlementContractModule";
import { BridgeContractType } from "./contracts/BridgeContract";
import {
  BridgeContractConfig,
  BridgeContractProtocolModule,
} from "./contracts/BridgeContractProtocolModule";
import { GetContracts, InferContractType } from "./modularity/types";
import { BridgingSettlementContractType } from "./contracts/settlement/BridgingSettlementContract";
import { SettlementContractType } from "./contracts/settlement/SettlementBase";
import {
  SettlementContractConfig,
  SettlementSmartContractModule,
} from "./contracts/SettlementSmartContractModule";

export type SettlementModulesRecord = ModulesRecord<
  TypedClass<ContractModule<unknown, unknown>>
>;

export type MandatorySettlementModulesRecord = {
  SettlementContract: TypedClass<
    ContractModule<SettlementContractType, SettlementContractConfig>
  >;
};

export type BridgingSettlementModulesRecord = {
  SettlementContract: TypedClass<
    ContractModule<BridgingSettlementContractType, SettlementContractConfig>
  >;
  DispatchContract: TypedClass<ContractModule<DispatchContractType, unknown>>;
  BridgeContract: TypedClass<
    ContractModule<BridgeContractType, BridgeContractConfig>
  >;
};

@injectable()
export class SettlementContractModule<
  SettlementModules extends SettlementModulesRecord,
>
  extends ModuleContainer<SettlementModules>
  implements ProtocolModule<unknown>
{
  public constructor(definition: SettlementModules) {
    super(definition);
  }

  public static from<SettlementModules extends SettlementModulesRecord>(
    modules: SettlementModules
  ): TypedClass<SettlementContractModule<SettlementModules>> {
    return class ScopedSettlementContractModule extends SettlementContractModule<SettlementModules> {
      public constructor() {
        super(modules);
      }
    };
  }

  public static settlementOnly() {
    return {
      SettlementContract: SettlementSmartContractModule,
    } as const;
  }

  public static settlementAndBridging() {
    return {
      SettlementContract: BridgingSettlementContractModule,
      DispatchContract: DispatchContractProtocolModule,
      BridgeContract: BridgeContractProtocolModule,
    } as const;
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

  public createContract<ContractName extends StringKeyOf<SettlementModules>>(
    contractName: ContractName,
    address: PublicKey,
    tokenId?: Field
  ): InferContractType<SettlementModules[ContractName]> {
    const module = this.resolve(contractName);
    const ContractClass = module.contractFactory();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return new ContractClass(address, tokenId) as InferContractType<
      SettlementModules[ContractName]
    >;
  }

  public createContracts<
    ContractName extends keyof SettlementModules,
  >(addresses: {
    [Key in ContractName]: PublicKey;
  }): {
    [Key in ContractName]: SmartContract &
      InferContractType<SettlementModules[Key]>;
  } {
    const classes = this.getContractClasses();

    const obj: Record<string, SmartContract> = {};
    // eslint-disable-next-line guard-for-in
    for (const key in addresses) {
      const ContractClass = classes[key];
      obj[key] = new ContractClass(addresses[key]);
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return obj as {
      [Key in keyof SettlementModules]: SmartContract &
        InferContractType<SettlementModules[Key]>;
    };
  }
}
