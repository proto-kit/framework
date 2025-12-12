import { inject, injectable, injectAll } from "tsyringe";
import {
  ArtifactRecord,
  ChildVerificationKeyService,
  CompileRegistry,
  log,
} from "@proto-kit/common";

import { BlockProvable } from "../../prover/block/BlockProvable";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "../ContractModule";
import { ProvableSettlementHook } from "../modularity/ProvableSettlementHook";

import {
  BridgingSettlementContractType,
  BridgingSettlementContract,
} from "./settlement/BridgingSettlementContract";
import { SettlementBase } from "./settlement/SettlementBase";

export type SettlementContractConfig = {
  escapeHatchSlotsInterval?: number;
};

// 24 hours
export const DEFAULT_ESCAPE_HATCH = (60 / 3) * 24;

@injectable()
export class SettlementSmartContractModule extends ContractModule<
  BridgingSettlementContractType,
  SettlementContractConfig
> {
  public constructor(
    @injectAll("ProvableSettlementHook")
    private readonly hooks: ProvableSettlementHook<unknown>[],
    @inject("BlockProver")
    private readonly blockProver: BlockProvable,
    private readonly childVerificationKeyService: ChildVerificationKeyService
  ) {
    super();
  }

  public contractFactory(): SmartContractClassFromInterface<BridgingSettlementContractType> {
    const { hooks, config } = this;

    const escapeHatchSlotsInterval =
      config.escapeHatchSlotsInterval ?? DEFAULT_ESCAPE_HATCH;

    const { args } = SettlementBase;
    SettlementBase.args = {
      ...args,
      hooks,
      escapeHatchSlotsInterval,
      signedSettlements: args?.signedSettlements,
      ChildVerificationKeyService: this.childVerificationKeyService,
    };

    return BridgingSettlementContract;
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<ArtifactRecord | undefined> {
    // Dependencies
    await this.blockProver.compile(registry);

    this.contractFactory();

    log.debug("Compiling Settlement Contract");

    const artifact = await registry.forceProverExists(
      async (reg) => await registry.compile(BridgingSettlementContract)
    );

    return {
      SettlementSmartContract: artifact,
    };
  }
}
