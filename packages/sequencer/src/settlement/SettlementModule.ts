import {
  Protocol,
  SettlementContractModule,
  BATCH_SIGNATURE_PREFIX,
  DispatchSmartContract,
  SettlementSmartContract,
  MandatorySettlementModulesRecord,
  MandatoryProtocolModulesRecord,
  SettlementSmartContractBase,
  DynamicBlockProof,
} from "@proto-kit/protocol";
import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  Signature,
  TokenContract,
  TokenId,
  Transaction,
} from "o1js";
import { inject } from "tsyringe";
import {
  EventEmitter,
  EventEmittingComponent,
  log,
  AreProofsEnabled,
  DependencyFactory,
} from "@proto-kit/common";
// eslint-disable-next-line import/no-extraneous-dependencies
import truncate from "lodash/truncate";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { Batch, SettleableBatch } from "../storage/model/Batch";
import { BlockProofSerializer } from "../protocol/production/tasks/serializers/BlockProofSerializer";
import { Settlement } from "../storage/model/Settlement";
import { FeeStrategy } from "../protocol/baselayer/fees/FeeStrategy";
import { SettlementStartupModule } from "../sequencer/SettlementStartupModule";
import { SettlementStorage } from "../storage/repositories/SettlementStorage";

import { MinaTransactionSender } from "./transactions/MinaTransactionSender";
import { ProvenSettlementPermissions } from "./permissions/ProvenSettlementPermissions";
import { SignedSettlementPermissions } from "./permissions/SignedSettlementPermissions";
import { SettlementUtils } from "./utils/SettlementUtils";
import { BridgingModule } from "./BridgingModule";

export type SettlementModuleConfig = {
  feepayer: PrivateKey;
} & {
  // TODO Add possibility to only configure public keys (for proven operation)
  keys?: {
    settlement: PrivateKey;
    dispatch: PrivateKey;
    minaBridge: PrivateKey;
  };
};

export type SettlementModuleEvents = {
  "settlement-submitted": [Batch];
};

@sequencerModule()
export class SettlementModule
  extends SequencerModule<SettlementModuleConfig>
  implements EventEmittingComponent<SettlementModuleEvents>, DependencyFactory
{
  protected contracts?: {
    settlement: SettlementSmartContract;
    dispatch: DispatchSmartContract;
  };

  private keys?: {
    settlement: PrivateKey;
    dispatch: PrivateKey;
    minaBridge: PrivateKey;
  };

  public utils: SettlementUtils;

  public events = new EventEmitter<SettlementModuleEvents>();

  public constructor(
    @inject("BaseLayer") baseLayer: MinaBaseLayer,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage,
    private readonly blockProofSerializer: BlockProofSerializer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender,
    @inject("AreProofsEnabled") areProofsEnabled: AreProofsEnabled,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy,
    private readonly settlementStartupModule: SettlementStartupModule
  ) {
    super();
    this.utils = new SettlementUtils(areProofsEnabled, baseLayer);
  }

  public dependencies() {
    return {
      BridgingModule: {
        useClass: BridgingModule,
      },
    };
  }

  protected settlementContractModule(): SettlementContractModule<MandatorySettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public getContractKeys(): {
    settlement: PrivateKey;
    dispatch: PrivateKey;
    minaBridge: PrivateKey;
  } {
    const keys = this.keys ?? this.config.keys;
    if (keys === undefined) {
      throw new Error("Contracts not initialized yet");
    }
    return keys;
  }

  public getContractSigningKeys() {
    return Object.values(this.getContractKeys());
  }

  public getAddresses() {
    const keys = this.getContractKeys();
    return {
      settlement: keys.settlement.toPublicKey(),
      dispatch: keys.dispatch.toPublicKey(),
    };
  }

  public getContracts() {
    if (this.contracts === undefined) {
      const addresses = this.getAddresses();
      const { protocol } = this;

      const settlementContractModule = protocol.dependencyContainer.resolve<
        SettlementContractModule<MandatorySettlementModulesRecord>
      >("SettlementContractModule");

      // TODO Add generic inference of concrete Contract types
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.contracts = settlementContractModule.createContracts(addresses) as {
        settlement: SettlementSmartContract;
        dispatch: DispatchSmartContract;
      };
    }
    return this.contracts;
  }

  public signTransaction(
    tx: Transaction<false, false>,
    pks: PrivateKey[],
    tokenContractKeys: PrivateKey[] = [],
    preventNoncePreconditionFor: PublicKey[] = []
  ): Transaction<false, true> {
    return this.utils.signTransaction(
      tx,
      pks,
      this.getContractSigningKeys().concat(tokenContractKeys),
      preventNoncePreconditionFor
    );
  }

  private async fetchContractAccounts() {
    const contracts = this.getContracts();
    await this.utils.fetchContractAccounts(
      contracts.settlement,
      contracts.dispatch
    );
  }

  public async settleBatch(
    batch: SettleableBatch,
    options: {
      nonce?: number;
    } = {}
  ): Promise<Settlement> {
    await this.fetchContractAccounts();
    const { settlement: settlementContract, dispatch } = this.getContracts();
    const { feepayer } = this.config;

    log.debug("Preparing settlement");

    const lastSettlementL1BlockHeight =
      settlementContract.lastSettlementL1BlockHeight.get().value;
    const signature = Signature.create(feepayer, [
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1BlockHeight,
    ]);

    const latestSequenceStateHash = dispatch.account.actionState.get();

    const blockProof = await this.blockProofSerializer
      .getBlockProofSerializer()
      .fromJSONProof(batch.proof);

    const dynamicBlockProof = DynamicBlockProof.fromProof(blockProof);

    const tx = await Mina.transaction(
      {
        sender: feepayer.toPublicKey(),
        nonce: options?.nonce,
        fee: this.feeStrategy.getFee(),
        memo: "Protokit settle",
      },
      async () => {
        await settlementContract.settle(
          dynamicBlockProof,
          signature,
          dispatch.address,
          feepayer.toPublicKey(),
          batch.fromNetworkState,
          batch.toNetworkState,
          latestSequenceStateHash
        );
      }
    );

    this.utils.signTransaction(tx, [feepayer], this.getContractSigningKeys());

    const { hash: transactionHash } =
      await this.transactionSender.proveAndSendTransaction(tx, "included");

    log.info("Settlement transaction sent and included");

    const settlement = {
      batches: [batch.height],
      promisedMessagesHash: latestSequenceStateHash.toString(),
      transactionHash,
    };

    await this.settlementStorage.pushSettlement(settlement);

    this.events.emit("settlement-submitted", batch);

    return settlement;
  }

  public async deploy(
    settlementKey: PrivateKey,
    dispatchKey: PrivateKey,
    minaBridgeKey: PrivateKey,
    options: {
      nonce?: number;
    } = {}
  ) {
    const feepayerKey = this.config.feepayer;
    const feepayer = feepayerKey.toPublicKey();

    const nonce = options?.nonce ?? 0;

    const sm = this.protocol.dependencyContainer.resolve<
      SettlementContractModule<MandatorySettlementModulesRecord>
    >("SettlementContractModule");
    const { settlement, dispatch } = sm.createContracts({
      settlement: settlementKey.toPublicKey(),
      dispatch: dispatchKey.toPublicKey(),
    });

    const verificationsKeys =
      await this.settlementStartupModule.retrieveVerificationKeys();

    const permissions = this.utils.isSignedSettlement()
      ? new SignedSettlementPermissions()
      : new ProvenSettlementPermissions();

    const tx = await Mina.transaction(
      {
        sender: feepayer,
        nonce,
        fee: this.feeStrategy.getFee(),
        memo: "Protokit settlement deploy",
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 2);

        await dispatch.deployAndInitialize(
          {
            verificationKey:
              verificationsKeys.DispatchSmartContract.verificationKey,
          },
          permissions.dispatchContract(),
          settlement.address
        );

        await settlement.deployAndInitialize(
          {
            verificationKey:
              verificationsKeys.SettlementSmartContract.verificationKey,
          },
          permissions.settlementContract(),
          feepayerKey.toPublicKey(),
          dispatchKey.toPublicKey()
        );
      }
    ).sign([feepayerKey, settlementKey, dispatchKey]);
    // Note: We can't use this.signTransaction on the above tx

    // This should already apply the tx result to the
    // cached accounts / local blockchain
    await this.transactionSender.proveAndSendTransaction(tx, "included");

    this.keys = {
      settlement: settlementKey,
      dispatch: dispatchKey,
      minaBridge: minaBridgeKey,
    };

    await this.utils.fetchContractAccounts(settlement, dispatch);

    const initTx = await Mina.transaction(
      {
        sender: feepayer,
        nonce: nonce + 1,
        fee: this.feeStrategy.getFee(),
        memo: "Deploy MINA bridge",
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 1);
        // Deploy bridge contract for $Mina
        await settlement.addTokenBridge(
          TokenId.default,
          minaBridgeKey.toPublicKey(),
          dispatchKey.toPublicKey()
        );
      }
    );

    const initTxSigned = this.utils.signTransaction(
      initTx,
      // Specify the mina bridge key here explicitly, since initialize() will issue
      // a account update to that address and by default new accounts have a signature permission
      [feepayerKey, minaBridgeKey],
      [...this.getContractSigningKeys(), minaBridgeKey]
    );

    await this.transactionSender.proveAndSendTransaction(
      initTxSigned,
      "included"
    );
  }

  public async deployTokenBridge(
    owner: TokenContract,
    ownerKey: PrivateKey,
    contractKey: PrivateKey,
    options: {
      nonce?: number;
    }
  ) {
    const feepayerKey = this.config.feepayer;
    const feepayer = feepayerKey.toPublicKey();
    const nonce = options?.nonce ?? undefined;

    const tokenId = owner.deriveTokenId();
    const { settlement, dispatch } = this.getContracts();

    const tx = await Mina.transaction(
      {
        sender: feepayer,
        nonce: nonce,
        memo: `Deploy token bridge for ${truncate(tokenId.toString(), { length: 6 })}`,
        fee: this.feeStrategy.getFee(),
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 1);
        await settlement.addTokenBridge(
          tokenId,
          contractKey.toPublicKey(),
          dispatch.address
        );
        await owner.approveAccountUpdate(settlement.self);
      }
    );

    const txSigned = this.utils.signTransaction(
      tx,
      // Specify the mina bridge key here explicitly, since deploy() will issue
      // a account update to that address and by default new accounts have a signature permission
      [feepayerKey, contractKey],
      [...this.getContractSigningKeys(), ownerKey]
    );

    await this.transactionSender.proveAndSendTransaction(txSigned, "included");
  }

  public async start(): Promise<void> {
    const contractArgs = SettlementSmartContractBase.args;

    SettlementSmartContractBase.args = {
      ...contractArgs,
      signedSettlements: this.utils.isSignedSettlement(),
      // TODO Add distinction between mina and custom tokens
      BridgeContractPermissions: (this.utils.isSignedSettlement()
        ? new SignedSettlementPermissions()
        : new ProvenSettlementPermissions()
      ).bridgeContractMina(),
    };
  }
}
