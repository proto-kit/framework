import {
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  SettlementContract,
  SettlementContractModule,
  BATCH_SIGNATURE_PREFIX,
  SettlementMethodIdMapping,
  Path,
  OutgoingMessageArgument,
  OutgoingMessageArgumentBatch,
  OUTGOING_MESSAGE_BATCH_SIZE,
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
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import { FlowCreator } from "../worker/flow/Flow";

import { IncomingMessageAdapter } from "./messages/IncomingMessageAdapter";
import { SettlementStorage } from "../storage/repositories/SettlementStorage";
import { MessageStorage } from "../storage/repositories/MessageStorage";
import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  filterNonUndefined,
  log,
  noop,
  RollupMerkleTree,
} from "@proto-kit/common";
import {
  MethodIdResolver,
  Runtime,
  RuntimeMethodInvocationType,
  runtimeMethodTypeMetadataKey,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { ComputedBlock } from "../storage/model/Block";
import {
  OutgoingMessageQueue,
  WithdrawalQueue,
} from "./messages/WithdrawalQueue";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";
import { CachedMerkleTreeStore } from "../state/merkle/CachedMerkleTreeStore";

export interface SettlementModuleConfig {
  feepayer: PrivateKey;
  address?: PublicKey;
}

export interface SettlementModuleEvents extends EventsRecord {
  settlementSubmitted: [ComputedBlock, Mina.TransactionId];
}

// const PROPERTY_SETTLEMENT_CONTRACT_ADDRESS = "SETTLEMENT_CONTRACT_ADDRESS";

// const SETTLEMENT_BATCH_SIZE = 1;

@sequencerModule()
export class SettlementModule
  extends SequencerModule<SettlementModuleConfig>
  implements EventEmittingComponent<SettlementModuleEvents>
{
  private contract?: SettlementContract;

  public address?: PublicKey;

  public events = new EventEmitter<SettlementModuleEvents>();

  public constructor(
    @inject("BaseLayer")
    private readonly baseLayer: MinaBaseLayer,
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
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
    private readonly merkleTreeStore: AsyncMerkleTreeStore
  ) {
    super();
  }

  public async getContract(): Promise<SettlementContract> {
    if (this.contract === undefined) {
      const { address } = this;
      if (address === undefined) {
        throw new Error(
          "Settlement Contract hasn't been deployed yet. Deploy it first, then restart"
        );
      }
      const settlementContractModule =
        this.protocol.dependencyContainer.resolve<SettlementContractModule>(
          "SettlementContractModule"
        );
      this.contract = settlementContractModule.createContract(
        address,
        this.generateMethodIdMap()
      );
    }
    return this.contract;
  }

  public generateMethodIdMap(): SettlementMethodIdMapping {
    const methodIdResolver =
      this.runtime.dependencyContainer.resolve<MethodIdResolver>(
        "MethodIdResolver"
      );

    const rawMappings = this.runtime.moduleNames.flatMap((moduleName) => {
      const module = this.runtime.resolve(moduleName);
      return module.runtimeMethodNames.map((method) => {
        const type = Reflect.getMetadata(
          runtimeMethodTypeMetadataKey,
          module,
          method
        ) as RuntimeMethodInvocationType | undefined;

        if (type !== undefined && type === "INCOMING_MESSAGE") {
          return {
            name: `${moduleName}.${method}`,
            methodId: methodIdResolver.getMethodId(moduleName, method),
          } as const;
        }

        return undefined;
      });
    });

    return rawMappings
      .filter(filterNonUndefined)
      .reduce<SettlementMethodIdMapping>((acc, entry) => {
        acc[entry.name] = entry.methodId;
        return acc;
      }, {});
  }

  public async sendRollupTransactions(options: { nonce: number }): Promise<
    {
      txId: Mina.TransactionId;
      tx: Mina.Transaction;
    }[]
  > {
    const length = this.outgoingMessageQueue.length();
    const { feepayer } = this.config;

    const txs: {
      txId: Mina.TransactionId;
      tx: Mina.Transaction;
    }[] = [];

    let nonce = options.nonce;

    const contract = await this.getContract();

    const cachedStore = new CachedMerkleTreeStore(this.merkleTreeStore);
    const tree = new RollupMerkleTree(cachedStore);

    const basePath = Path.fromProperty("Withdrawals", "withdrawals");

    for (let i = 0; i < length; i += OUTGOING_MESSAGE_BATCH_SIZE) {
      const batch = this.outgoingMessageQueue.peek(OUTGOING_MESSAGE_BATCH_SIZE);

      const keys = batch.map((x) =>
        Path.fromKey(basePath, Field, Field(x.index))
      );
      // Preload keys
      // TODO Use preloadKeys() after persistance PR
      await Promise.all(
        keys.map((key) => cachedStore.preloadKey(key.toBigInt()))
      );

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
          nonce,
          fee: String(0.01 * 1e9),
          memo: "Protokit settle",
        },
        () => {
          contract.rollupOutgoingMessages(
            OutgoingMessageArgumentBatch.fromMessages(transactionParamaters)
          );
        }
      );

      tx.sign([feepayer]);
      await tx.prove();
      const txId = await tx.send();

      await txId.wait();

      this.outgoingMessageQueue.pop(OUTGOING_MESSAGE_BATCH_SIZE);

      txs.push({
        tx,
        txId,
      });
    }

    return txs;
  }

  public async settleBatch(
    batch: ComputedBlock,
    networkStateFrom: NetworkState,
    networkStateTo: NetworkState,
    options: {
      nonce?: number;
    } = {}
  ) {
    const contract = await this.getContract();
    const { feepayer } = this.config;

    log.debug("Preparing settlement");

    const lastSettlementL1Block = contract.lastSettlementL1Block.get().value;
    const signature = Signature.create(feepayer, [
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1Block,
    ]);

    const fromSequenceStateHash = contract.honoredMessagesHash.get();
    const latestSequenceStateHash = contract.account.actionState.get();

    // Fetch actions and store them into the messageStorage
    const actions = await this.incomingMessagesAdapter.getPendingMessages(
      contract.address,
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

    const tx = await Mina.transaction(
      {
        sender: feepayer.toPublicKey(),
        nonce: options?.nonce,
        fee: String(0.01 * 1e9),
        memo: "Protokit settle",
      },
      () => {
        contract.settle(
          batch.proof,
          signature,
          feepayer.toPublicKey(),
          networkStateFrom,
          networkStateTo,
          latestSequenceStateHash
        );
      }
    );

    await tx.prove();
    tx.sign([feepayer]);

    const sent = await tx.send();

    log.info(`Settlement transaction send ${sent.hash() ?? "-"}`);

    this.events.emit("settlementSubmitted", batch, sent);

    return sent;
  }

  public async deploy(
    zkappKey: PrivateKey,
    options: { nonce?: number } = {}
  ): Promise<Mina.TransactionId> {
    const feepayerKey = this.config.feepayer;
    const feepayer = feepayerKey.toPublicKey();

    const nonce = options?.nonce ?? 0;

    // const flow = this.flowCreator.createFlow<undefined>(
    //   `deploy-${feepayer.toBase58()}-${nonce.toString()}`,
    //   undefined
    // );

    const sm =
      this.protocol.dependencyContainer.resolve<SettlementContractModule>(
        "SettlementContractModule"
      );
    const contract = sm.createContract(
      zkappKey.toPublicKey(),
      this.generateMethodIdMap()
    );

    const tx = await Mina.transaction(
      {
        sender: feepayer,
        nonce,
        fee: String(0.01 * 1e9),
        memo: "Protokit settlement deploy",
      },
      () => {
        AccountUpdate.fundNewAccount(feepayer);
        contract.deploy({
          zkappKey,
          verificationKey: undefined,
        });
      }
    );

    const result = tx;
    await result.prove();

    // TODO Move proving to tasks
    // const input: DeployTaskArgs = {
    //   proofsEnabled: false,
    //   transaction: result,
    // };
    //
    // const result = await flow.withFlow<Mina.Transaction>(async () => {
    //   await flow.pushTask(this.settlementDeployTask, input, async (result) => {
    //     flow.resolve(result);
    //   });
    // });

    result.sign([feepayerKey, zkappKey]);

    const txId1 = await result.send();
    if (!this.baseLayer.config.network.local) {
      await txId1.wait();
    }

    const tx2 = await Mina.transaction(
      {
        sender: feepayer,
        nonce: nonce + 1,
        fee: String(0.01 * 1e9),
        memo: "Protokit settlement init",
      },
      () => {
        contract.initialize(feepayerKey.toPublicKey());
      }
    );
    await tx2.prove();
    tx2.sign([feepayerKey]);

    this.address = zkappKey.toPublicKey();

    return await tx2.send();
  }

  public async start(): Promise<void> {
    noop();
  }
}
