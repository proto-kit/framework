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

import { DispatchContractArgs } from "./DispatchSmartContract";
import {
  BridgingSettlementContractType,
  BridgingSettlementContract,
  BridgingSettlementContractArgs,
} from "./settlement/BridgingSettlementContract";
import { BridgeContractArgs } from "./BridgeContract";
import { DispatchContractProtocolModule } from "./DispatchContractProtocolModule";
import { BridgeContractProtocolModule } from "./BridgeContractProtocolModule";
import {
  DEFAULT_ESCAPE_HATCH,
  SettlementContractConfig,
} from "./SettlementSmartContractModule";
import { SettlementContract } from "./settlement/SettlementContract";

@injectable()
export class BridgingSettlementContractModule extends ContractModule<
  BridgingSettlementContractType,
  SettlementContractConfig
> {
  public constructor(
    @injectAll("ProvableSettlementHook")
    private readonly hooks: ProvableSettlementHook<unknown>[],
    @inject("BlockProver")
    private readonly blockProver: BlockProvable,
    @inject("DispatchContract")
    private readonly dispatchContractModule: DispatchContractProtocolModule,
    @inject("BridgeContract")
    private readonly bridgeContractModule: BridgeContractProtocolModule,
    private readonly childVerificationKeyService: ChildVerificationKeyService,
    private readonly argsRegistry: ContractArgsRegistry
  ) {
    super();
  }

  public contractFactory(): SmartContractClassFromInterface<BridgingSettlementContractType> {
    const { hooks, config } = this;
    const dispatchContract = this.dispatchContractModule.contractFactory();
    const bridgeContract = this.bridgeContractModule.contractFactory();

    const escapeHatchSlotsInterval =
      config.escapeHatchSlotsInterval ?? DEFAULT_ESCAPE_HATCH;

    this.argsRegistry.addArgs<BridgingSettlementContractArgs>(
      "SettlementContract",
      {
        DispatchContract: dispatchContract,
        hooks,
        escapeHatchSlotsInterval,
        BridgeContract: bridgeContract,
        ChildVerificationKeyService: this.childVerificationKeyService,
      }
    );

    // Ideally, we don't want to have this cyclic dependency, but we have it in the protocol,
    // So it's logical that we can't avoid that here
    this.argsRegistry.addArgs<BridgeContractArgs>("BridgeContract", {
      SettlementContract: BridgingSettlementContract,
    });
    this.argsRegistry.addArgs<DispatchContractArgs>("DispatchContract", {
      settlementContractClass: BridgingSettlementContract,
    });

    return BridgingSettlementContract;
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<ArtifactRecord | undefined> {
    // Dependencies
    const bridgeArtifact = await this.bridgeContractModule.compile(registry);

    await this.blockProver.compile(registry);

    this.contractFactory();

    // Init params
    this.argsRegistry.addArgs<BridgingSettlementContractArgs>(
      "SettlementContract",
      {
        BridgeContractVerificationKey:
          bridgeArtifact.BridgeContract.verificationKey,
      }
    );

    log.debug("Compiling Settlement Contract");

    const artifact = await registry.forceProverExists(
      async (reg) =>
        await registry.compile(
          BridgingSettlementContract,
          SettlementContract.name
        )
    );

    return {
      SettlementSmartContract: artifact,
    };
  }
}
