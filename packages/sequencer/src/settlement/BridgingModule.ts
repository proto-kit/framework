import { inject } from "tsyringe";
import {
  BridgeContractConfig,
  BridgeContractType,
  MandatoryProtocolModulesRecord,
  MandatorySettlementModulesRecord,
  OUTGOING_MESSAGE_BATCH_SIZE,
  OutgoingMessageArgument,
  OutgoingMessageArgumentBatch,
  OutgoingMessageKey,
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
  Provable,
  PublicKey,
  TokenContractV2,
  TokenId,
  Transaction,
  UInt32,
} from "o1js";
import {
  AreProofsEnabled,
  filterNonUndefined,
  log,
  noop,
  RollupMerkleTree,
} from "@proto-kit/common";
import { match, Pattern } from "ts-pattern";
import { FungibleToken } from "mina-fungible-token";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import { CachedMerkleTreeStore } from "../state/merkle/CachedMerkleTreeStore";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";
import { FeeStrategy } from "../protocol/baselayer/fees/FeeStrategy";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";

import type { OutgoingMessageQueue } from "./messages/WithdrawalQueue";
import type { SettlementModule } from "./SettlementModule";
import { SettlementUtils } from "./utils/SettlementUtils";
import { MinaTransactionSender } from "./transactions/MinaTransactionSender";

/**
 * Sequencer module that facilitates all transaction creation and monitoring for
 * bridging related operations.
 * Additionally, this keeps track of all deployed bridges and created the contracts
 * for those as needed
 */
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
    const { deployments } = this.seenBridgeDeployments;

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
          bridgingContractPrivateKey?: PrivateKey;
        }
      | {
          nonce: number;
          tokenOwner: FungibleToken;
          bridgingContractPrivateKey?: PrivateKey;
          tokenOwnerPrivateKey?: PrivateKey;
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
          tokenOwnerPrivateKey: Pattern.optional(
            Pattern.instanceOf(PrivateKey)
          ),
        },
        ({
          nonce,
          tokenOwner,
          bridgingContractPrivateKey,
          tokenOwnerPrivateKey,
        }) => {
          return this.sendRollupTransactionsBase(
            async (au: AccountUpdate) => {
              await tokenOwner.approveAccountUpdate(au);
            },
            tokenOwner.deriveTokenId(),
            {
              nonce,
              contractKeys: [
                bridgingContractPrivateKey,
                tokenOwnerPrivateKey,
              ].filter(filterNonUndefined),
            }
          );
        }
      )
      .with(
        {
          nonce: Pattern.number,
          bridgingContractPrivateKey: Pattern.optional(
            Pattern.instanceOf(PrivateKey)
          ),
        },
        ({ nonce, bridgingContractPrivateKey }) => {
          return this.sendRollupTransactionsBase(
            async () => {},
            TokenId.default,
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
      .exhaustive();
  }

  public createBridgeContract(contractAddress: PublicKey, tokenId: Field) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return this.settlementContractModule().createBridgeContract(
      contractAddress,
      tokenId
    ) as BridgeContractType & TokenContractV2;
  }

  public async getBridgeContract(tokenId: Field) {
    const bridgeAddress = await this.getBridgeAddress(tokenId);

    if (bridgeAddress === undefined) {
      throw new Error(
        "No bridge contract found, maybe that token hasn't been bridged yet"
      );
    }

    return this.createBridgeContract(bridgeAddress, tokenId);
  }

  /**
   * All of this can be removed and replace with the proper API as soon as
   * https://github.com/o1-labs/o1js/pull/1853
   * is merged and released
   */
  private async fetchZkAppState(account: {
    address: PublicKey;
    tokenId?: Field;
  }): Promise<Field[]> {
    await this.utils.fetchContractAccounts(account);
    const acc = Mina.getAccount(account.address, account.tokenId);

    if (acc.zkapp === undefined) {
      throw new Error(`Account ${account.address.toBase58()} not a zkapp`);
    }

    return acc.zkapp.appState;
  }

  public async pullStateRoot(
    tokenWrapper: (au: AccountUpdate) => Promise<void>,
    tokenId: Field,
    options: { nonce: number; contractKeys: PrivateKey[] }
  ): Promise<{ nonceUsed: boolean }> {
    const settlementContract = this.settlementModule.getContracts().settlement;
    const bridge = await this.getBridgeContract(tokenId);

    log.debug(
      `Fetched bridge Contract ${bridge.address.toBase58()} @ ${tokenId.toString()}`
    );

    const settledRoot = await settlementContract.stateRoot.fetch();

    // Workaround, see fetchZkAppState() jsdoc
    const tokenBridgeState = await this.fetchZkAppState({
      address: bridge.address,
      tokenId: bridge.tokenId,
    });
    const tokenBridgeRoot = bridge.stateRoot.fromAppState(tokenBridgeState);

    if (settledRoot === undefined) {
      throw new Error("Couldn't fetch settlement contract state");
    }

    if (settledRoot.toBigInt() !== (tokenBridgeRoot?.toBigInt() ?? -1n)) {
      // Create transaction
      const { feepayer } = this.settlementModule.config;
      let { nonce } = options;

      const tx = await Mina.transaction(
        {
          sender: feepayer.toPublicKey(),
          // eslint-disable-next-line no-plusplus
          nonce: nonce++,
          fee: this.feeStrategy.getFee(),
          memo: "pull state root",
        },
        async () => {
          await bridge.updateStateRoot(settledRoot);
          await tokenWrapper(bridge.self);
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

      return {
        nonceUsed: true,
      };
    }
    // Roots match, no need to pull state root
    return { nonceUsed: false };
  }

  /* eslint-disable no-await-in-loop */
  public async sendRollupTransactionsBase(
    tokenWrapper: (au: AccountUpdate) => Promise<void>,
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

    const { nonceUsed } = await this.pullStateRoot(
      tokenWrapper,
      tokenId,
      options
    );
    if (nonceUsed) nonce += 1;

    const bridgeContract = this.createBridgeContract(bridgeAddress, tokenId);

    const cachedStore = new CachedMerkleTreeStore(this.merkleTreeStore);
    const tree = new RollupMerkleTree(cachedStore);

    const [withdrawalModule, withdrawalStateName] =
      this.getBridgingModuleConfig().withdrawalStatePath.split(".");
    const basePath = Path.fromProperty(withdrawalModule, withdrawalStateName);

    // Create withdrawal batches and send them as L1 transactions
    for (let i = 0; i < length; i += OUTGOING_MESSAGE_BATCH_SIZE) {
      const batch = this.outgoingMessageQueue.peek(OUTGOING_MESSAGE_BATCH_SIZE);

      const keys = batch.map((x) =>
        Path.fromKey(basePath, OutgoingMessageKey, {
          index: Field(x.index),
          tokenId,
        })
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
          const numNewAccounts = await bridgeContract.rollupOutgoingMessages(
            OutgoingMessageArgumentBatch.fromMessages(transactionParamaters)
          );
          const au = bridgeContract.self;
          await tokenWrapper(au);

          // Workaround to extract the return variables value without triggering snarky errors
          // It's not provable anyways since we are in the transaction compose block and not
          // in a zkapp method
          let numNewAccountsNumber = 0;
          Provable.asProver(() => {
            numNewAccountsNumber = Number(numNewAccounts.toString()) / 1e9;
          });

          // Pay account creation fees for internal token accounts
          AccountUpdate.fundNewAccount(
            feepayer.toPublicKey(),
            numNewAccountsNumber
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
