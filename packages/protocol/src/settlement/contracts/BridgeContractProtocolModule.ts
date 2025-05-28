import { injectable, injectAll } from "tsyringe";
import { CompileRegistry } from "@proto-kit/common";

import { ContractModule } from "../ContractModule";
import { OutgoingMessageProcessor } from "../modularity/OutgoingMessageProcessor";

import {
  BridgeContract,
  BridgeContractBase,
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
    private readonly messageProcessors: OutgoingMessageProcessor<unknown>[]
  ) {
    super();
  }

  public contractFactory() {
    const { config } = this;

    BridgeContractBase.args = {
      SettlementContract: BridgeContractBase.args?.SettlementContract,
      messageProcessors: this.messageProcessors,
      batchSize: config.outgoingBatchSize,
    };

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
