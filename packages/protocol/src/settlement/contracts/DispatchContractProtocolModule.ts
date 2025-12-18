import { inject, injectable } from "tsyringe";
import { PublicKey } from "o1js";
import { CompileRegistry } from "@proto-kit/common";

import { RuntimeLike, RuntimeMethodIdMapping } from "../../model/RuntimeLike";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "../ContractModule";
import { ContractArgsRegistry } from "../ContractArgsRegistry";

import {
  DispatchSmartContract,
  DispatchContractType,
  DispatchContractArgs,
} from "./DispatchSmartContract";

export type DispatchContractConfig = {
  incomingMessagesMethods: Record<string, `${string}.${string}`>;
};

@injectable()
export class DispatchContractProtocolModule extends ContractModule<
  DispatchContractType,
  DispatchContractConfig
> {
  public constructor(
    @inject("Runtime") private readonly runtime: RuntimeLike,
    private readonly contractArgsRegistry: ContractArgsRegistry
  ) {
    super();
  }

  public eventsDefinition() {
    return new DispatchSmartContract(PublicKey.empty<typeof PublicKey>())
      .events;
  }

  private checkConfigIntegrity(
    incomingMessagesMethods: Record<string, `${string}.${string}`>,
    runtimeMethodIds: RuntimeMethodIdMapping
  ) {
    const missing = Object.values(incomingMessagesMethods).filter(
      (method) => runtimeMethodIds[method] === undefined
    );
    if (missing.length > 0) {
      throw new Error(
        `Incoming messages config references a unknown methods: [${missing}]`
      );
    }
  }

  public contractFactory(): SmartContractClassFromInterface<DispatchContractType> {
    const { incomingMessagesMethods } = this.config;
    const methodIdMappings = this.runtime.methodIdResolver.methodIdMap();

    this.checkConfigIntegrity(incomingMessagesMethods, methodIdMappings);

    this.contractArgsRegistry.addArgs<DispatchContractArgs>(
      "DispatchContract",
      {
        incomingMessagesPaths: incomingMessagesMethods,
        methodIdMappings,
      }
    );

    return DispatchSmartContract;
  }

  public async compile(registry: CompileRegistry) {
    return {
      DispatchSmartContract: await registry.forceProverExists(
        async () => await registry.compile(DispatchSmartContract)
      ),
    };
  }
}
