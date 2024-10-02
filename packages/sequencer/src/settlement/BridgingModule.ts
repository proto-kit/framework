import { inject } from "tsyringe";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";

import { SettlementModule } from "./SettlementModule";
import {
  BridgeContractConfig,
  MandatoryProtocolModulesRecord,
  MandatorySettlementModulesRecord,
  OUTGOING_MESSAGE_BATCH_SIZE,
  OutgoingMessageArgument,
  OutgoingMessageArgumentBatch,
  Path,
  Protocol,
  SettlementContractModule,
  TokenMapping,
} from "@proto-kit/protocol";
import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  ProvablePure,
  PublicKey,
  TokenId,
  Transaction,
  UInt32,
} from "o1js";
import { CachedMerkleTreeStore } from "../state/merkle/CachedMerkleTreeStore";
import { AreProofsEnabled, noop, RollupMerkleTree } from "@proto-kit/common";
import type { OutgoingMessageQueue } from "./messages/WithdrawalQueue";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";
import { FeeStrategy } from "../protocol/baselayer/fees/FeeStrategy";
import { SettlementUtils } from "./utils/SettlementUtils";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { MinaTransactionSender } from "./transactions/MinaTransactionSender";
import { match, Pattern } from "ts-pattern";
import { FungibleToken } from "mina-fungible-token";

@sequencerModule()
export class BridgingModule extends SequencerModule {
  private seenBridgeDeployments: {
    latestDeployment: number;
    deployments: Record<string, PublicKey>;
  } = {
    latestDeployment: -1,
    deployments: {},
  };

  private utils: SettlementUtils;

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("SettlementModule")
    private readonly settlementModule: SettlementModule,
    @inject("OutgoingMessageQueue")
    private readonly outgoingMessageQueue: OutgoingMessageQueue,
    @inject("AsyncMerkleStore")
    private readonly merkleTreeStore: AsyncMerkleTreeStore,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy,
    @inject("AreProofsEnabled") areProofsEnabled: AreProofsEnabled,
    @inject("BaseLayer") baseLayer: MinaBaseLayer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender
  ) {
    super();
    this.utils = new SettlementUtils(areProofsEnabled, baseLayer);
  }

  protected settlementContractModule(): SettlementContractModule<MandatorySettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public getBridgingModuleConfig(): BridgeContractConfig {
    const settlementContractModule = this.settlementContractModule();

    const { config } = settlementContractModule.resolve("BridgeContract");

    if (config === undefined) {
      throw new Error("Failed to fetch config from BridgeContract");
    }
    return config;
  }

  public async updateBridgeAddresses() {
    const events = await this.settlementModule
      .getContracts()
      .settlement.fetchEvents(
        UInt32.from(this.seenBridgeDeployments.latestDeployment + 1)
      );
    const tuples = events
      .filter((event) => event.type === "token-bridge-deployed")
      .map((event) => {
        const mapping = event.event.data as unknown as TokenMapping;
        return [mapping.tokenId.toString(), mapping.publicKey];
      });
    const mergedDeployments = {
      ...this.seenBridgeDeployments.deployments,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      ...(Object.fromEntries(tuples) as Record<string, PublicKey>),
    };
    const latestDeployment = events
      .map((event) => Number(event.blockHeight.toString()))
      .reduce((a, b) => (a > b ? a : b), 0);
    this.seenBridgeDeployments = {
      deployments: mergedDeployments,
      latestDeployment,
    };
  }

  public async getBridgeAddress(
    tokenId: Field
  ): Promise<PublicKey | undefined> {
    const deployments = this.seenBridgeDeployments.deployments;

    if (Object.keys(deployments).includes(tokenId.toString())) {
      return deployments[tokenId.toString()];
    }

    await this.updateBridgeAddresses();
    return this.seenBridgeDeployments.deployments[tokenId.toString()];
  }

  public async sendRollupTransactions(
    options:
      | {
          nonce: number;
        }
      | {
          nonce: number;
          tokenOwner: FungibleToken;
          bridgingContractPrivateKey?: PrivateKey;
        }
  ) {
    return await match(options)
      .with(
        {
          nonce: Pattern.number,
          tokenOwner: Pattern.instanceOf(FungibleToken),
          bridgingContractPrivateKey: Pattern.optional(
            Pattern.instanceOf(PrivateKey)
          ),
        },
        ({ nonce, tokenOwner, bridgingContractPrivateKey }) => {
          return this.sendRollupTransactionsBase(
            async (au: AccountUpdate) => {
              await tokenOwner.approveAccountUpdate(au);
            },
            tokenOwner.deriveTokenId(),
            {
              nonce,
              contractKeys:
                bridgingContractPrivateKey !== undefined
                  ? [bridgingContractPrivateKey]
                  : [],
            }
          );
        }
      )
      .with({ nonce: Pattern.number }, ({ nonce }) => {
        return this.sendRollupTransactionsBase(
          async () => {},
          TokenId.default,
          {
            nonce,
            contractKeys: [],
          }
        );
      })
      .exhaustive();
  }

  /* eslint-disable no-await-in-loop */
  public async sendRollupTransactionsBase(
    transaction: (au: AccountUpdate) => Promise<void>,
    tokenId: Field,
    options: { nonce: number; contractKeys: PrivateKey[] }
  ): Promise<
    {
      tx: Transaction<false, true>;
    }[]
  > {
    const length = this.outgoingMessageQueue.length();
    const { feepayer } = this.settlementModule.config;
    let { nonce } = options;

    const txs: {
      tx: Transaction<false, true>;
    }[] = [];

    const bridgeAddress = await this.getBridgeAddress(tokenId);

    if (bridgeAddress === undefined) {
      throw new Error(
        "No bridge contract found, maybe that token hasn't been bridged yet"
      );
    }

    if (this.utils.isSignedSettlement() && options.contractKeys.length === 0) {
      throw new Error(
        "Bridging contract private key for signed settlement has to be provided"
      );
    }

    const bridgeContract = this.settlementContractModule().createBridgeContract(
      bridgeAddress,
      tokenId
    );

    const cachedStore = new CachedMerkleTreeStore(this.merkleTreeStore);
    const tree = new RollupMerkleTree(cachedStore);

    const [withdrawalModule, withdrawalStateName] =
      this.getBridgingModuleConfig().withdrawalStatePath.split(".");
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
          // eslint-disable-next-line no-plusplus
          nonce: nonce++,
          fee: this.feeStrategy.getFee(),
          memo: "roll up actions",
        },
        async () => {
          await bridgeContract.rollupOutgoingMessages(
            OutgoingMessageArgumentBatch.fromMessages(transactionParamaters)
          );
        }
      );

      const signedTx = this.utils.signTransaction(
        tx,
        [feepayer],
        options.contractKeys
      );

      await this.transactionSender.proveAndSendTransaction(
        signedTx,
        "included"
      );

      this.outgoingMessageQueue.pop(OUTGOING_MESSAGE_BATCH_SIZE);

      txs.push({
        tx: signedTx,
      });
    }

    return txs;
  }
  /* eslint-enable no-await-in-loop */

  public async start() {
    noop();
  }
}
