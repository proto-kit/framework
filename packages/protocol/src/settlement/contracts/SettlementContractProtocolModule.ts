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
  SettlementContractType,
  SettlementSmartContract,
  SettlementSmartContractBase,
} from "./SettlementSmartContract";
import { BridgeContractBase } from "./BridgeContract";
import { DispatchContractProtocolModule } from "./DispatchContractProtocolModule";
import { BridgeContractProtocolModule } from "./BridgeContractProtocolModule";

export type SettlementContractConfig = {
  escapeHatchSlotsInterval?: number;
};

// 24 hours
const DEFAULT_ESCAPE_HATCH = (60 / 3) * 24;

@injectable()
export class SettlementContractProtocolModule extends ContractModule<
  SettlementContractType,
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

  public contractFactory(): SmartContractClassFromInterface<SettlementContractType> {
    const { hooks, config } = this;
    const dispatchContract = this.dispatchContractModule.contractFactory();
    const bridgeContract = this.bridgeContractModule.contractFactory();

    const escapeHatchSlotsInterval =
      config.escapeHatchSlotsInterval ?? DEFAULT_ESCAPE_HATCH;

    const { args } = SettlementSmartContractBase;
    SettlementSmartContractBase.args = {
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
    BridgeContractBase.args.SettlementContract = SettlementSmartContract;

    DispatchSmartContractBase.args.settlementContractClass =
      SettlementSmartContract;

    return SettlementSmartContract;
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<ArtifactRecord | undefined> {
    // Dependencies
    const bridgeArtifact = await this.bridgeContractModule.compile(registry);

    await this.blockProver.compile(registry);

    // Init params
    SettlementSmartContractBase.args.BridgeContractVerificationKey =
      bridgeArtifact.BridgeContract.verificationKey;

    if (SettlementSmartContractBase.args.signedSettlements === undefined) {
      throw new Error(
        "Args not fully initialized - make sure to also include the SettlementModule in the sequencer"
      );
    }

    log.debug("Compiling Settlement Contract");

    const artifact = await registry.compile(SettlementSmartContract);

    return {
      SettlementSmartContract: artifact,
    };
  }
}
