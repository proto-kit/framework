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
import { ContractArgsRegistry } from "../ContractArgsRegistry";

import { BridgingSettlementContract } from "./settlement/BridgingSettlementContract";
import {
  SettlementContractArgs,
  SettlementContractType,
} from "./settlement/SettlementBase";
import { SettlementContract } from "./settlement/SettlementContract";

export type SettlementContractConfig = {
  escapeHatchSlotsInterval?: number;
};

// 24 hours
export const DEFAULT_ESCAPE_HATCH = (60 / 3) * 24;

@injectable()
export class SettlementSmartContractModule extends ContractModule<
  SettlementContractType,
  SettlementContractConfig
> {
  public constructor(
    @injectAll("ProvableSettlementHook")
    private readonly hooks: ProvableSettlementHook<unknown>[],
    @inject("BlockProver")
    private readonly blockProver: BlockProvable,
    private readonly childVerificationKeyService: ChildVerificationKeyService,
    private readonly argsRegistry: ContractArgsRegistry
  ) {
    super();
  }

  public contractFactory(): SmartContractClassFromInterface<SettlementContractType> {
    const { hooks, config } = this;

    const escapeHatchSlotsInterval =
      config.escapeHatchSlotsInterval ?? DEFAULT_ESCAPE_HATCH;

    this.argsRegistry.addArgs<SettlementContractArgs>("SettlementContract", {
      hooks,
      escapeHatchSlotsInterval,
      ChildVerificationKeyService: this.childVerificationKeyService,
    });

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
      async (reg) => await registry.compile(SettlementContract)
    );

    return {
      SettlementSmartContract: artifact,
    };
  }
}
