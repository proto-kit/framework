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

import { DispatchSmartContractBase } from "./DispatchSmartContract";
import {
  BridgingSettlementContractType,
  BridgingSettlementContractBase,
  BridgingSettlementContract,
} from "./settlement/BridgingSettlementContract";
import { BridgeContractBase } from "./BridgeContract";
import { DispatchContractProtocolModule } from "./DispatchContractProtocolModule";
import { BridgeContractProtocolModule } from "./BridgeContractProtocolModule";
import {
  DEFAULT_ESCAPE_HATCH,
  SettlementContractConfig,
} from "./SettlementSmartContractModule";

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
    private readonly childVerificationKeyService: ChildVerificationKeyService
  ) {
    super();
  }

  public contractFactory(): SmartContractClassFromInterface<BridgingSettlementContractType> {
    const { hooks, config } = this;
    const dispatchContract = this.dispatchContractModule.contractFactory();
    const bridgeContract = this.bridgeContractModule.contractFactory();

    const escapeHatchSlotsInterval =
      config.escapeHatchSlotsInterval ?? DEFAULT_ESCAPE_HATCH;

    const { args } = BridgingSettlementContractBase;
    BridgingSettlementContractBase.args = {
      ...args,
      DispatchContract: dispatchContract,
      hooks,
      escapeHatchSlotsInterval,
      BridgeContract: bridgeContract,
      BridgeContractVerificationKey: args?.BridgeContractVerificationKey,
      BridgeContractPermissions: args?.BridgeContractPermissions,
      signedSettlements: args?.signedSettlements,
      ChildVerificationKeyService: this.childVerificationKeyService,
    };

    // Ideally we don't want to have this cyclic dependency, but we have it in the protocol,
    // So its logical that we can't avoid that here
    BridgeContractBase.args.SettlementContract = BridgingSettlementContract;

    DispatchSmartContractBase.args.settlementContractClass =
      BridgingSettlementContract;

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
    BridgingSettlementContractBase.args.BridgeContractVerificationKey =
      bridgeArtifact.BridgeContract.verificationKey;

    if (BridgingSettlementContractBase.args.signedSettlements === undefined) {
      throw new Error(
        "Args not fully initialized - make sure to also include the SettlementModule in the sequencer"
      );
    }

    log.debug("Compiling Settlement Contract");

    const artifact = await registry.forceProverExists(
      async (reg) => await registry.compile(BridgingSettlementContract)
    );

    return {
      SettlementSmartContract: artifact,
    };
  }
}
