import {
  Protocol,
  SettlementContractModule,
  MandatorySettlementModulesRecord,
  MandatoryProtocolModulesRecord,
  type SettlementContractType,
  ContractArgsRegistry,
  SettlementContractArgs,
} from "@proto-kit/protocol";
import { fetchAccount, Field, Mina, PublicKey, SmartContract } from "o1js";
import { inject } from "tsyringe";
import {
  EventEmitter,
  EventEmittingComponent,
  DependencyFactory,
  ModuleContainerLike,
  DependencyRecord,
  log,
} from "@proto-kit/common";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { Batch, SettleableBatch } from "../storage/model/Batch";
import { Settlement } from "../storage/model/Settlement";
import { SettlementStorage } from "../storage/repositories/SettlementStorage";

import { SettlementUtils } from "./utils/SettlementUtils";
import type { BridgingModule } from "./BridgingModule";
import { MinaSigner } from "./MinaSigner";
import { BridgingDeployInteraction } from "./interactions/bridging/BridgingDeployInteraction";
import { VanillaDeployInteraction } from "./interactions/vanilla/VanillaDeployInteraction";
import { BridgingSettlementInteraction } from "./interactions/bridging/BridgingSettlementInteraction";
import { VanillaSettlementInteraction } from "./interactions/vanilla/VanillaSettlementInteraction";
import {
  AddressRegistry,
  InMemoryAddressRegistry,
} from "./interactions/AddressRegistry";

export type SettlementModuleConfig = {
  addresses?: {
    SettlementContract: PublicKey;
  };
};

export type SettlementModuleEvents = {
  "settlement-submitted": [Batch];
};

@sequencerModule()
export class SettlementModule
  extends SequencerModule<SettlementModuleConfig>
  implements EventEmittingComponent<SettlementModuleEvents>
{
  protected contract?: SettlementContractType & SmartContract;

  public utils: SettlementUtils;

  public events = new EventEmitter<SettlementModuleEvents>();

  public constructor(
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    @inject("Sequencer")
    private readonly parentContainer: ModuleContainerLike,
    @inject("AddressRegistry")
    private readonly addressRegistry: AddressRegistry,
    private readonly argsRegistry: ContractArgsRegistry
  ) {
    super();
    this.utils = new SettlementUtils(this.baseLayer, this.signer);
  }

  public static dependencies(): DependencyRecord {
    return {
      AddressRegistry: {
        useClass: InMemoryAddressRegistry,
      },
    };
  }

  private bridgingModule(): BridgingModule | undefined {
    const container = this.parentContainer.dependencyContainer;
    if (container.isRegistered("BridgingModule")) {
      return container.resolve<BridgingModule>("BridgingModule");
    }
    return undefined;
  }

  protected settlementContractModule(): SettlementContractModule<MandatorySettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public getSettlementContractAddress(): PublicKey {
    const keys =
      this.addressRegistry.getContractAddress("SettlementContract") ??
      this.config.addresses?.SettlementContract;

    if (keys === undefined) {
      throw new Error("Contracts not initialized yet");
    }
    return keys;
  }

  public getSettlementContract() {
    if (this.contract === undefined) {
      const address = this.getSettlementContractAddress();
      this.contract = this.settlementContractModule().createContract(
        "SettlementContract",
        address
      );
    }

    return this.contract;
  }

  public getContract() {
    if (this.contract === undefined) {
      const address = this.getSettlementContractAddress();
      const { protocol } = this;

      const settlementContractModule = protocol.dependencyContainer.resolve<
        SettlementContractModule<MandatorySettlementModulesRecord>
      >("SettlementContractModule");

      const contracts = settlementContractModule.createContracts({
        SettlementContract: address,
      });
      this.contract = contracts.SettlementContract;
    }
    return this.contract;
  }

  public async settleBatch(
    batch: SettleableBatch,
    options: {
      nonce?: number;
    } = {}
  ): Promise<Settlement> {
    log.debug("Preparing settlement");

    const bridgingModule = this.bridgingModule();
    const interaction =
      bridgingModule !== undefined
        ? this.parentContainer.dependencyContainer.resolve(
            BridgingSettlementInteraction
          )
        : this.parentContainer.dependencyContainer.resolve(
            VanillaSettlementInteraction
          );
    const settlement = await interaction.settle(batch, options);

    await this.settlementStorage.pushSettlement(settlement);

    this.events.emit("settlement-submitted", batch);

    return settlement;
  }

  // Can't do anything for now - initialize() method use settlementKey.
  // TODO Rethink that interface - deploy with addresses as args would be pretty nice
  public async deploy(
    addresses: {
      settlementContract: PublicKey;
      dispatchContract?: PublicKey;
    },
    options: {
      nonce?: number;
    } = {}
  ) {
    const bridgingModule = this.bridgingModule();
    // TODO Add overwriting in dependency factories and then resolve based on that here
    const interaction =
      bridgingModule !== undefined
        ? this.parentContainer.dependencyContainer.resolve(
            BridgingDeployInteraction
          )
        : this.parentContainer.dependencyContainer.resolve(
            VanillaDeployInteraction
          );

    await interaction.deploy(addresses, options);
  }

  public async start(): Promise<void> {
    const contractArgs =
      this.argsRegistry.getArgs<SettlementContractArgs>("SettlementContract");

    this.argsRegistry.setArgs("SettlementContract", {
      ...contractArgs,
      signedSettlements: this.baseLayer.isSignedSettlement(),
    });

    const settlementContractAddress = this.config.addresses?.SettlementContract;
    if (settlementContractAddress !== undefined) {
      this.addressRegistry.addContractAddress(
        "SettlementContract",
        settlementContractAddress
      );

      await this.checkDeployment();
    }
  }

  public async checkDeployment(
    tokenBridges?: Array<{ address: PublicKey; tokenId: Field }>
  ): Promise<void> {
    const addresses = [
      this.addressRegistry.getContractAddress("SettlementContract")!,
    ];

    const bridgeContractAddress =
      this.bridgingModule()?.config.addresses?.DispatchContract;
    if (bridgeContractAddress !== undefined) {
      addresses.push(bridgeContractAddress);
    }

    const contracts: Array<{ address: PublicKey; tokenId?: Field }> = [
      ...addresses.map((addr) => ({ address: addr })),
      ...(tokenBridges ?? []),
    ];

    const isLocal = this.baseLayer.isLocalBlockChain();
    const missing: Array<{ address: string; error: string }> = [];

    await Promise.all(
      contracts.map(async ({ address, tokenId }) => {
        if (isLocal) {
          if (!Mina.hasAccount(address, tokenId)) {
            missing.push({
              address: address.toBase58(),
              error: "Not found on local chain",
            });
          }
        } else {
          const { account, error } = await fetchAccount({
            publicKey: address,
            tokenId,
          });
          if (account === null || account === undefined) {
            missing.push({
              address: address.toBase58(),
              error: error?.statusText ?? "Not found on chain",
            });
          }
        }
      })
    );

    if (missing.length > 0) {
      const errorList = missing
        .map((m) => `  ${m.address}: ${m.error}`)
        .join("\n");
      throw new Error(`
        Missing contracts:\n${errorList}
        `);
    }
  }
}

SettlementModule satisfies DependencyFactory;
