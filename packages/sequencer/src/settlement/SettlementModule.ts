import {
  Protocol,
  ProtocolModulesRecord,
  SettlementContractModule,
  BATCH_SIGNATURE_PREFIX,
  Path,
  OutgoingMessageArgument,
  OutgoingMessageArgumentBatch,
  OUTGOING_MESSAGE_BATCH_SIZE,
  SettlementModulesRecord,
  DispatchSmartContract,
  SettlementSmartContract,
  SettlementContractConfig,
  MandatorySettlementModulesRecord,
  MandatoryProtocolModulesRecord,
} from "@proto-kit/protocol";
import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  Signature,
} from "o1js";
import { inject } from "tsyringe";
import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  log,
  noop,
  RollupMerkleTree,
} from "@proto-kit/common";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import { FlowCreator } from "../worker/flow/Flow";
import { SettlementStorage } from "../storage/repositories/SettlementStorage";
import { MessageStorage } from "../storage/repositories/MessageStorage";
import { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { ComputedBlock, SettleableBatch } from "../storage/model/Block";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";
import { CachedMerkleTreeStore } from "../state/merkle/CachedMerkleTreeStore";
import { BlockProofSerializer } from "../protocol/production/helpers/BlockProofSerializer";
import { Settlement } from "../storage/model/Settlement";

import { IncomingMessageAdapter } from "./messages/IncomingMessageAdapter";
import { OutgoingMessageQueue } from "./messages/WithdrawalQueue";
import { MinaTransactionSender } from "./transactions/MinaTransactionSender";

export interface SettlementModuleConfig {
  feepayer: PrivateKey;
  address?: PublicKey;
}

export type SettlementModuleEvents = {
  "settlement-submitted": [ComputedBlock];
};

@sequencerModule()
export class SettlementModule
  extends SequencerModule<SettlementModuleConfig>
  implements EventEmittingComponent<SettlementModuleEvents>
{
  protected contracts?: {
    settlement: SettlementSmartContract;
    dispatch: DispatchSmartContract;
  };

  protected settlementModuleConfig?: SettlementContractConfig;

  public addresses?: {
    settlement: PublicKey;
    dispatch: PublicKey;
  };

  public events = new EventEmitter<SettlementModuleEvents>();

  public constructor(
    @inject("BaseLayer")
    private readonly baseLayer: MinaBaseLayer,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("Runtime")
    private readonly runtime: Runtime<RuntimeModulesRecord>,
    private readonly flowCreator: FlowCreator,
    @inject("IncomingMessageAdapter")
    private readonly incomingMessagesAdapter: IncomingMessageAdapter,
    @inject("MessageStorage")
    private readonly messageStorage: MessageStorage,
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage,
    @inject("OutgoingMessageQueue")
    private readonly outgoingMessageQueue: OutgoingMessageQueue,
    @inject("AsyncMerkleStore")
    private readonly merkleTreeStore: AsyncMerkleTreeStore,
    private readonly blockProofSerializer: BlockProofSerializer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender
  ) {
    super();
  }

  private settlementContractModule(): SettlementContractModule<MandatorySettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public getSettlementModuleConfig(): SettlementContractConfig {
    if (this.settlementModuleConfig === undefined) {
      const settlementContractModule = this.settlementContractModule();

      this.settlementModuleConfig =
        settlementContractModule.resolve("SettlementContract").config;

      if (this.settlementModuleConfig === undefined) {
        throw new Error("Failed to fetch config from SettlementContract");
      }
    }
    return this.settlementModuleConfig;
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
      this.contracts = settlementContractModule.createContracts(addresses) as {
        settlement: SettlementSmartContract;
        dispatch: DispatchSmartContract;
      };
    }
    return this.contracts;
  }

  public async sendRollupTransactions(options: { nonce: number }): Promise<
    {
      tx: Mina.Transaction;
    }[]
  > {
    const length = this.outgoingMessageQueue.length();
    const { feepayer } = this.config;
    let { nonce } = options;

    const txs: {
      tx: Mina.Transaction;
    }[] = [];

    const { settlement } = this.getContracts();

    const cachedStore = new CachedMerkleTreeStore(this.merkleTreeStore);
    const tree = new RollupMerkleTree(cachedStore);

    const [withdrawalModule, withdrawalStateName] =
      this.getSettlementModuleConfig().withdrawalStatePath.split(".");
    const basePath = Path.fromProperty(withdrawalModule, withdrawalStateName);

    for (let i = 0; i < length; i += OUTGOING_MESSAGE_BATCH_SIZE) {
      const batch = this.outgoingMessageQueue.peek(OUTGOING_MESSAGE_BATCH_SIZE);

      const keys = batch.map((x) =>
        Path.fromKey(basePath, Field, Field(x.index))
      );
      // Preload keys
      await cachedStore.preloadKeys(keys.map((key) => key.toBigInt()));

      const transactionParamaters = batch.map((message, index) => {
        const witness = tree.getWitness(keys[index].toBigInt());
        return new OutgoingMessageArgument({
          witness,
          value: message.value,
        });
      });

      const tx = await Mina.transaction(
        {
          sender: feepayer.toPublicKey(),
          nonce: nonce++,
          fee: String(0.01 * 1e9),
          memo: "Protokit settle",
        },
        async () => {
          settlement.rollupOutgoingMessages(
            OutgoingMessageArgumentBatch.fromMessages(transactionParamaters)
          );
        }
      );

      tx.sign([feepayer]);

      await this.transactionSender.proveAndSendTransaction(tx);

      this.outgoingMessageQueue.pop(OUTGOING_MESSAGE_BATCH_SIZE);

      txs.push({
        tx,
      });
    }

    return txs;
  }

  public async settleBatch(
    batch: SettleableBatch,
    options: {
      nonce?: number;
    } = {}
  ): Promise<Settlement> {
    const { settlement, dispatch } = await this.getContracts();
    const { feepayer } = this.config;

    log.debug("Preparing settlement");

    const lastSettlementL1Block = settlement.lastSettlementL1Block.get().value;
    const signature = Signature.create(feepayer, [
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1Block,
    ]);

    const fromSequenceStateHash = dispatch.honoredMessagesHash.get();
    const latestSequenceStateHash = settlement.account.actionState.get();

    // Fetch actions and store them into the messageStorage
    const actions = await this.incomingMessagesAdapter.getPendingMessages(
      settlement.address,
      {
        fromActionHash: fromSequenceStateHash.toString(),
        toActionHash: latestSequenceStateHash.toString(),
        fromL1Block: Number(lastSettlementL1Block.toString()),
      }
    );
    await this.messageStorage.pushMessages(
      actions.from,
      actions.to,
      actions.messages
    );

    const blockProof = this.blockProofSerializer
      .getBlockProofSerializer()
      .fromJSONProof(batch.proof);

    const tx = await Mina.transaction(
      {
        sender: feepayer.toPublicKey(),
        nonce: options?.nonce,
        fee: String(0.01 * 1e9),
        memo: "Protokit settle",
      },
      async () => {
        settlement.settle(
          blockProof,
          signature,
          dispatch.address,
          feepayer.toPublicKey(),
          batch.fromNetworkState,
          batch.toNetworkState,
          latestSequenceStateHash
        );
      }
    );

    console.log("Preconditions:");

    tx.sign([feepayer]);

    await this.transactionSender.proveAndSendTransaction(tx);

    log.info(`Settlement transaction send queued`);

    this.events.emit("settlement-submitted", batch);

    return {
      // transactionHash: sent.hash() ?? "",
      batches: [batch.height],
      promisedMessagesHash: latestSequenceStateHash.toString(),
    };
  }

  public async deploy(
    settlementKey: PrivateKey,
    dispatchKey: PrivateKey,
    options: { nonce?: number } = {}
  ) {
    const feepayerKey = this.config.feepayer;
    const feepayer = feepayerKey.toPublicKey();

    const nonce = options?.nonce ?? 0;

    // const flow = this.flowCreator.createFlow<undefined>(
    //   `deploy-${feepayer.toBase58()}-${nonce.toString()}`,
    //   undefined
    // );

    const sm = this.protocol.dependencyContainer.resolve<
      SettlementContractModule<MandatorySettlementModulesRecord>
    >("SettlementContractModule");
    const { settlement, dispatch } = sm.createContracts({
      settlement: settlementKey.toPublicKey(),
      dispatch: dispatchKey.toPublicKey(),
    });

    const tx = await Mina.transaction(
      {
        sender: feepayer,
        nonce,
        fee: String(0.01 * 1e9),
        memo: "Protokit settlement deploy",
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 2);
        settlement.deploy({
          verificationKey: undefined,
        });

        dispatch.deploy({
          verificationKey: undefined,
        });
      }
    );

    tx.sign([feepayerKey, settlementKey, dispatchKey]);

    // This should already apply the tx result to the
    // cached accounts / local blockchain
    await this.transactionSender.proveAndSendTransaction(tx);

    const tx2 = await Mina.transaction(
      {
        sender: feepayer,
        nonce: nonce + 1,
        fee: String(0.01 * 1e9),
        memo: "Protokit settlement init",
      },
      async () => {
        settlement.initialize(
          feepayerKey.toPublicKey(),
          dispatchKey.toPublicKey()
        );
      }
    );
    tx2.sign([feepayerKey]);

    await this.transactionSender.proveAndSendTransaction(tx2);

    this.addresses = {
      settlement: settlementKey.toPublicKey(),
      dispatch: dispatchKey.toPublicKey(),
    };
  }

  public async start(): Promise<void> {
    noop();
  }
}
