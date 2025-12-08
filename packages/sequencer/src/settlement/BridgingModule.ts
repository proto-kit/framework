import { container, inject, injectable } from "tsyringe";
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
  TokenBridgeTree,
  TokenBridgeAttestation,
  OutgoingMessageProcessor,
  PROTOKIT_FIELD_PREFIXES,
  OutgoingMessageEvent,
  BridgeContractContext,
} from "@proto-kit/protocol";
import {
  AccountUpdate,
  Field,
  Mina,
  Provable,
  PublicKey,
  TokenContract,
  TokenId,
  Transaction,
  UInt32,
} from "o1js";
import {
  AreProofsEnabled,
  filterNonUndefined,
  LinkedMerkleTree,
  log,
  prefixToField,
  reduceSequential,
} from "@proto-kit/common";
import { match, Pattern } from "ts-pattern";
import { FungibleToken } from "mina-fungible-token";
// eslint-disable-next-line import/no-extraneous-dependencies
import groupBy from "lodash/groupBy";

import { FeeStrategy } from "../protocol/baselayer/fees/FeeStrategy";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { AsyncLinkedLeafStore } from "../state/async/AsyncLinkedLeafStore";
import { CachedLinkedLeafStore } from "../state/lmt/CachedLinkedLeafStore";
import { SettleableBatch } from "../storage/model/Batch";

import type { SettlementModule } from "./SettlementModule";
import { SettlementUtils } from "./utils/SettlementUtils";
import { MinaTransactionSender } from "./transactions/MinaTransactionSender";
import { OutgoingMessageCollector } from "./messages/outgoing/OutgoingMessageCollector";
import { ArchiveNode } from "./utils/ArchiveNode";
import { MinaSigner } from "./MinaSigner";

export type SettlementTokenConfig = Record<
  string,
  | {
      bridgingContractPublicKey?: PublicKey;
    }
  | {
      tokenOwner: FungibleToken;
      bridgingContractPublicKey?: PublicKey;
      tokenOwnerPublicKey?: PublicKey;
    }
>;

/**
 * Module that facilitates all transaction creation and monitoring for
 * bridging related operations.
 * Additionally, this keeps track of all deployed bridges and created the contracts
 * for those as needed
 */
@injectable()
export class BridgingModule {
  private seenBridgeDeployments: {
    latestDeployment: number;
    // tokenId => Bridge address
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
    private readonly outgoingMessageCollector: OutgoingMessageCollector,
    @inject("AsyncLinkedLeafStore")
    private readonly linkedLeafStore: AsyncLinkedLeafStore,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy,
    @inject("AreProofsEnabled") areProofsEnabled: AreProofsEnabled,
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender
  ) {
    this.utils = new SettlementUtils(areProofsEnabled, baseLayer, signer);
  }

  private getMessageProcessors() {
    return this.protocol.dependencyContainer.resolveAll<
      OutgoingMessageProcessor<unknown, unknown>
    >("OutgoingMessageProcessor");
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
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

  public async getDepositContractAttestation(tokenId: Field) {
    await ArchiveNode.waitOnSync(this.baseLayer.config);

    const { dispatch } = this.settlementModule.getContracts();

    const tree = await TokenBridgeTree.buildTreeFromEvents(dispatch);
    const index = tree.getIndex(tokenId);
    return new TokenBridgeAttestation({
      index: Field(index),
      witness: tree.getWitness(index),
    });
  }

  private async fetchFeepayerNonce() {
    const feepayer = this.signer.getFeepayerKey();
    return await this.transactionSender.getNextNonce(feepayer);
  }

  public async sendRollupTransactions(
    batches: SettleableBatch[],
    tokenConfigs: SettlementTokenConfig,
    initialNonceOverride?: number
  ) {
    /**
     * get all messages since then
     * group by tokenid
     * for each tokenid
     *  pull state root
     *  send rollup txs
     */

    const initialNonce =
      initialNonceOverride ?? (await this.fetchFeepayerNonce());

    const allEvents = await Promise.all(
      batches.map((batch) =>
        this.outgoingMessageCollector.extractEventsFromBatch(batch)
      )
    );

    log.debug(`Found ${allEvents.length} outgoing messages`);

    const groupedEvents = groupBy(allEvents.flat(), (event) =>
      event.key.tokenId.toString()
    );

    const { txs: allSentTxs } = await reduceSequential(
      Object.entries(groupedEvents).filter(([, events]) => events.length > 0),
      async ({ txs }, [tokenId, events]) => {
        const config = tokenConfigs[tokenId];
        if (config === undefined) {
          log.debug(
            `Config for tokenId ${tokenId} not found, skipping rollup of outgoing messages`
          );
          return { txs };
        }

        const newTxs = await this.sendRollupTransactionsForToken(events, {
          nonce: initialNonce + txs.length,
          ...config,
        });
        log.info(`Rolled up withdrawals for token ${tokenId}`);

        return { txs: txs.concat(...newTxs) };
      },
      { txs: new Array<{ tx: Mina.Transaction<false, true> }>() }
    );

    return allSentTxs;
  }

  public async sendRollupTransactionsForToken(
    events: OutgoingMessageEvent<any>[],
    options:
      | {
          nonce: number;
          bridgingContractPublicKey?: PublicKey;
        }
      | {
          nonce: number;
          tokenOwner: FungibleToken;
          bridgingContractPublicKey?: PublicKey;
          tokenOwnerPublicKey?: PublicKey;
        }
  ) {
    return await match(options)
      .with(
        {
          nonce: Pattern.number,
          tokenOwner: Pattern.instanceOf(FungibleToken),
          bridgingContractPublicKey: Pattern.optional(
            Pattern.instanceOf(PublicKey)
          ),
          tokenOwnerPublicKey: Pattern.optional(Pattern.instanceOf(PublicKey)),
        },
        ({
          nonce,
          tokenOwner,
          bridgingContractPublicKey,
          tokenOwnerPublicKey,
        }) => {
          return this.sendRollupTransactionsBase(
            async (au: AccountUpdate) => {
              await tokenOwner.approveAccountUpdate(au);
            },
            tokenOwner.deriveTokenId(),
            events,
            {
              nonce,
              contractKeys: [
                bridgingContractPublicKey,
                tokenOwnerPublicKey,
              ].filter(filterNonUndefined),
            }
          );
        }
      )
      .with(
        {
          nonce: Pattern.number,
          bridgingContractPublicKey: Pattern.optional(
            Pattern.instanceOf(PublicKey)
          ),
        },
        ({ nonce, bridgingContractPublicKey }) => {
          return this.sendRollupTransactionsBase(
            async () => {},
            TokenId.default,
            events,
            {
              nonce,
              contractKeys:
                bridgingContractPublicKey !== undefined
                  ? [bridgingContractPublicKey]
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
    ) as BridgeContractType & TokenContract;
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
    options: { nonce: number; contractKeys: PublicKey[] }
  ): Promise<
    | { nonceUsed: false }
    | { nonceUsed: true; tx: Mina.Transaction<false, true> }
  > {
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
      const feepayer = this.signer.getFeepayerKey();
      let { nonce } = options;

      const tx = await Mina.transaction(
        {
          sender: feepayer,
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

      const signedTx = this.utils.signTransaction(tx, {
        signingWithSignatureCheck: options.contractKeys,
      });

      await this.transactionSender.proveAndSendTransaction(
        signedTx,
        "included"
      );

      return {
        nonceUsed: true,
        tx: signedTx,
      };
    }
    // Roots match, no need to pull state root
    return { nonceUsed: false };
  }

  /* eslint-disable no-await-in-loop */
  public async sendRollupTransactionsBase(
    tokenWrapper: (au: AccountUpdate) => Promise<void>,
    tokenId: Field,
    events: OutgoingMessageEvent<any>[],
    options: { nonce: number; contractKeys: PublicKey[] }
  ): Promise<
    {
      tx: Transaction<false, true>;
    }[]
  > {
    const feepayer = this.signer.getFeepayerKey();
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

    if (
      this.baseLayer.isSignedSettlement() &&
      options.contractKeys.length === 0
    ) {
      throw new Error(
        "Bridging contract private key for signed settlement has to be provided"
      );
    }

    const pullStateRootTx = await this.pullStateRoot(
      tokenWrapper,
      tokenId,
      options
    );
    if (pullStateRootTx.nonceUsed) {
      nonce += 1;
      txs.push(pullStateRootTx);
    }

    const bridgeContract = this.createBridgeContract(bridgeAddress, tokenId);

    const cachedStore = await CachedLinkedLeafStore.new(this.linkedLeafStore);
    const tree = new LinkedMerkleTree(cachedStore.treeStore, cachedStore);

    // Create withdrawal batches and send them as L1 transactions
    for (let i = 0; i < events.length; i += OUTGOING_MESSAGE_BATCH_SIZE) {
      const batch = events.slice(i, i + OUTGOING_MESSAGE_BATCH_SIZE);

      const keys = batch.map((x) =>
        Path.fromKey(
          PROTOKIT_FIELD_PREFIXES.OUTGOING_MESSAGE_BASE_PATH,
          OutgoingMessageKey,
          x.key
        )
      );
      // Preload keys
      await cachedStore.preloadKeys(keys.map((key) => key.toBigInt()));

      const transactionParameters = batch.map((message, index) => {
        const witness = tree.getReadWitness(keys[index].toBigInt());
        return new OutgoingMessageArgument({
          witness,
          messageType: message.messageType,
        });
      });

      const contextData = transactionParameters.map((arg, j) =>
        this.getMessageProcessors().map((processor) => {
          return prefixToField(processor.messageType)
            .equals(arg.messageType)
            .toBoolean()
            ? batch[j].value
            : processor.dummy();
        })
      );
      container.resolve(BridgeContractContext).data = {
        messageInputs: contextData,
      };
      // TODO Somehow make sure this data ends up in the proving task

      const tx = await Mina.transaction(
        {
          sender: feepayer,
          // eslint-disable-next-line no-plusplus
          nonce: nonce++,
          fee: this.feeStrategy.getFee(),
          memo: "roll up actions",
        },
        async () => {
          const numNewAccounts = await bridgeContract.rollupOutgoingMessages(
            OutgoingMessageArgumentBatch.fromMessages(transactionParameters)
          );
          const au = bridgeContract.self;
          await tokenWrapper(au);

          // Workaround to extract the return variables value without triggering snarky errors
          // It's not provable anyways since we are in the transaction compose block and not
          // in a zkapp method
          let numNewAccountsNumber = 0;
          Provable.asProver(() => {
            numNewAccountsNumber = parseInt(numNewAccounts.toString(), 10);
          });

          // Pay account creation fees for internal token accounts
          AccountUpdate.fundNewAccount(feepayer, numNewAccountsNumber);
        }
      );

      log.debug("Sending rollup transaction:");
      log.debug(tx.toPretty());

      const signedTx = this.utils.signTransaction(tx, {
        signingWithSignatureCheck: [...options.contractKeys],
      });

      await this.transactionSender.proveAndSendTransaction(
        signedTx,
        "included"
      );

      txs.push({
        tx: signedTx,
      });
    }

    return txs;
  }
  /* eslint-enable no-await-in-loop */
}
