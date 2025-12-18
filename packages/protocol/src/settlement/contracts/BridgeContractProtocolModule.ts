import { injectable, injectAll } from "tsyringe";
import { CompileRegistry } from "@proto-kit/common";

import { ContractModule } from "../ContractModule";
import { OutgoingMessageProcessor } from "../modularity/OutgoingMessageProcessor";
import { ContractArgsRegistry } from "../ContractArgsRegistry";

import {
  BridgeContract,
  BridgeContractArgs,
  BridgeContractType,
} from "./BridgeContract";

export type BridgeContractConfig = {
  outgoingBatchSize?: number;
};

@injectable()
export class BridgeContractProtocolModule extends ContractModule<
  BridgeContractType,
  BridgeContractConfig
> {
  public constructor(
    @injectAll("OutgoingMessageProcessor", { isOptional: true })
    private readonly messageProcessors: OutgoingMessageProcessor<unknown>[],
    private readonly contractArgsRegistry: ContractArgsRegistry
  ) {
    super();
  }

  public contractFactory() {
    const { config } = this;

    this.contractArgsRegistry.addArgs<BridgeContractArgs>("BridgeContract", {
      messageProcessors: this.messageProcessors,
      batchSize: config.outgoingBatchSize,
    });

    return BridgeContract;
  }

  public async compile(registry: CompileRegistry) {
    return {
      BridgeContract: await registry.forceProverExists(
        async () => await registry.compile(BridgeContract)
      ),
    };
  }
}
