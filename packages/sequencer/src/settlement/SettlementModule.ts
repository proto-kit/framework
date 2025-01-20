import {
  Protocol,
  SettlementContractModule,
  BATCH_SIGNATURE_PREFIX,
  DispatchSmartContract,
  SettlementSmartContract,
  MandatorySettlementModulesRecord,
  MandatoryProtocolModulesRecord,
  BlockProverPublicOutput,
  SettlementSmartContractBase,
  DynamicBlockProof,
} from "@proto-kit/protocol";
import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  Signature,
  TokenContractV2,
  Transaction,
} from "o1js";
import { inject } from "tsyringe";
import {
  EventEmitter,
  EventEmittingComponent,
  log,
  AreProofsEnabled,
  DependencyFactory,
  CompileRegistry,
} from "@proto-kit/common";
import truncate from "lodash/truncate";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import { MessageStorage } from "../storage/repositories/MessageStorage";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { Batch, SettleableBatch } from "../storage/model/Batch";
import { BlockProofSerializer } from "../protocol/production/helpers/BlockProofSerializer";
import { Settlement } from "../storage/model/Settlement";
import { FeeStrategy } from "../protocol/baselayer/fees/FeeStrategy";

import { IncomingMessageAdapter } from "./messages/IncomingMessageAdapter";
import { MinaTransactionSender } from "./transactions/MinaTransactionSender";
import { ProvenSettlementPermissions } from "./permissions/ProvenSettlementPermissions";
import { SignedSettlementPermissions } from "./permissions/SignedSettlementPermissions";
import { SettlementUtils } from "./utils/SettlementUtils";
import { BridgingModule } from "./BridgingModule";

export interface SettlementModuleConfig {
  feepayer: PrivateKey;
  address?: PublicKey;
}

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

  public addresses?: {
    settlement: PublicKey;
    dispatch: PublicKey;
  };

  public keys?: {
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
    @inject("IncomingMessageAdapter")
    private readonly incomingMessagesAdapter: IncomingMessageAdapter,
    @inject("MessageStorage")
    private readonly messageStorage: MessageStorage,
    private readonly blockProofSerializer: BlockProofSerializer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender,
    @inject("AreProofsEnabled") areProofsEnabled: AreProofsEnabled,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy,
    private readonly compileRegistry: CompileRegistry
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

  private getContractKeys(): PrivateKey[] {
    if (this.keys === undefined) {
      throw new Error("Contracts not initialized yet");
    }
    return [this.keys.dispatch, this.keys.settlement];
  }

  public getContracts() {
    if (this.contracts === undefined) {
      const { addresses, protocol } = this;
      if (addresses === undefined) {
        throw new Error(
          "Settlement Contract hasn't been deployed yet. Deploy it first, then restart"
        );
      }
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
    pks: PrivateKey[]
  ): Transaction<false, true> {
    return this.utils.signTransaction(tx, pks, this.getContractKeys());
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
    const { settlement, dispatch } = this.getContracts();
    const { feepayer } = this.config;

    log.debug("Preparing settlement");

    const lastSettlementL1BlockHeight =
      settlement.lastSettlementL1BlockHeight.get().value;
    const signature = Signature.create(feepayer, [
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1BlockHeight,
    ]);

    const fromSequenceStateHash = BlockProverPublicOutput.fromFields(
      batch.proof.publicOutput.map((x) => Field(x))
    ).incomingMessagesHash;
    const latestSequenceStateHash = dispatch.account.actionState.get();

    // Fetch actions and store them into the messageStorage
    const actions = await this.incomingMessagesAdapter.getPendingMessages(
      dispatch.address,
      {
        fromActionHash: fromSequenceStateHash.toString(),
        toActionHash: latestSequenceStateHash.toString(),
        fromL1BlockHeight: Number(lastSettlementL1BlockHeight.toString()),
      }
    );
    await this.messageStorage.pushMessages(
      actions.from,
      actions.to,
      actions.messages
    );

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
        await settlement.settle(
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

    this.utils.signTransaction(tx, [feepayer], this.getContractKeys());

    await this.transactionSender.proveAndSendTransaction(tx, "included");

    log.info("Settlement transaction send queued");

    this.events.emit("settlement-submitted", batch);

    return {
      batches: [batch.height],
      promisedMessagesHash: latestSequenceStateHash.toString(),
    };
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

    // const verificationKey:

    const sm = this.protocol.dependencyContainer.resolve<
      SettlementContractModule<MandatorySettlementModulesRecord>
    >("SettlementContractModule");
    const { settlement, dispatch } = sm.createContracts({
      settlement: settlementKey.toPublicKey(),
      dispatch: dispatchKey.toPublicKey(),
    });

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
        await settlement.deploy({
          // TODO Create compilation task that generates those artifacts if proofs enabled
          verificationKey: undefined,
        });
        settlement.account.permissions.set(permissions.settlementContract());

        await dispatch.deploy({
          verificationKey: undefined,
        });
        dispatch.account.permissions.set(permissions.dispatchContract());
      }
    ).sign([feepayerKey, settlementKey, dispatchKey]);
    // Note: We can't use this.signTransaction on the above tx

    // This should already apply the tx result to the
    // cached accounts / local blockchain
    await this.transactionSender.proveAndSendTransaction(tx, "included");

    this.addresses = {
      settlement: settlementKey.toPublicKey(),
      dispatch: dispatchKey.toPublicKey(),
    };
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
        memo: "Protokit settlement init",
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 1);
        await settlement.initialize(
          feepayerKey.toPublicKey(),
          dispatchKey.toPublicKey(),
          minaBridgeKey.toPublicKey(),
          settlementKey
        );
      }
    );

    const initTxSigned = this.utils.signTransaction(
      initTx,
      // Specify the mina bridge key here explicitly, since initialize() will issue
      // a account update to that address and by default new accounts have a signature permission
      [feepayerKey, minaBridgeKey],
      [...this.getContractKeys(), minaBridgeKey]
    );

    await this.transactionSender.proveAndSendTransaction(
      initTxSigned,
      "included"
    );
  }

  public async deployTokenBridge(
    owner: TokenContractV2,
    ownerKey: PrivateKey,
    contractKey: PrivateKey,
    options: {
      nonce?: number;
    }
  ) {
    const feepayerKey = this.config.feepayer;
    const feepayer = feepayerKey.toPublicKey();
    const nonce = options?.nonce ?? 0;

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
      [...this.getContractKeys(), ownerKey]
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
