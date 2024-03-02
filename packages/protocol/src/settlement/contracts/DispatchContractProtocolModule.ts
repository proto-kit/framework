import { inject, injectable } from "tsyringe";

import { RuntimeLike } from "../../model/RuntimeLike";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "../ContractModule";

import {
  DispatchSmartContract,
  DispatchContractType,
} from "./DispatchSmartContract";

export type DispatchContractConfig = {
  incomingMessagesMethods: Record<string, `${string}.${string}`>;
};

@injectable()
export class DispatchContractProtocolModule extends ContractModule<
  DispatchContractType,
  undefined,
  DispatchContractConfig
> {
  public constructor(@inject("Runtime") private readonly runtime: RuntimeLike) {
    super();
  }

  public contractFactory(): SmartContractClassFromInterface<DispatchContractType> {
    const { incomingMessagesMethods } = this.config;
    const methodIdMappings = this.runtime.methodIdResolver.methodIdMap();

    DispatchSmartContract.args = {
      incomingMessagesPaths: incomingMessagesMethods,
      methodIdMappings,
    };

    return DispatchSmartContract;
  }
}
