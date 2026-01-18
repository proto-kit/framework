import {
  EventEmitter,
  log,
  noop,
  ModuleContainerLike,
} from "@proto-kit/common";
import { container, inject } from "tsyringe";
import {
  AccountStateHook,
  BlockHashMerkleTree,
  MandatoryProtocolModulesRecord,
  ProvableNetworkState,
  NetworkState,
  Protocol,
  ProvableHookBlockState,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  StateServiceProvider,
} from "@proto-kit/protocol";
import { Field } from "o1js";

import type { Mempool, MempoolEvents } from "../Mempool";
import {
  PendingTransaction,
} from "../PendingTransaction";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { TransactionStorage } from "../../storage/repositories/TransactionStorage";
import { TransactionValidator } from "../verification/TransactionValidator";
import { BlockStorage } from "../../storage/repositories/BlockStorage";
import { CachedStateService } from "../../state/state/CachedStateService";
import { AsyncStateService } from "../../state/async/AsyncStateService";
import { distinctByPredicate } from "../../helpers/utils";
import { Tracer } from "../../logging/Tracer";
import { trace } from "../../logging/trace";

type MempoolTransactionPaths = {
  transaction: PendingTransaction;
  paths: string[];
};

interface PrivateMempoolConfig {
  validationEnabled?: boolean;
}

@sequencerModule()
export class PrivateMempool
  extends SequencerModule<PrivateMempoolConfig>
  implements Mempool
{
  public readonly events = new EventEmitter<MempoolEvents>();

  private readonly accountStateHook: AccountStateHook;

  public constructor(
    private readonly transactionValidator: TransactionValidator,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("Sequencer")
    private readonly sequencer: ModuleContainerLike,
    @inject("UnprovenStateService")
    private readonly stateService: AsyncStateService,
    @inject("Tracer") public readonly tracer: Tracer
  ) {
    super();
    this.accountStateHook =
      this.protocol.dependencyContainer.resolve("AccountState");
  }

  public async length(): Promise<number> {
    const txs = await this.transactionStorage.getPendingUserTransactions();
    return txs.length;
  }

  public async add(tx: PendingTransaction): Promise<boolean> {
    const [txValid, error] = this.transactionValidator.validateTx(tx);
    if (txValid) {
      const success = await this.transactionStorage.pushUserTransaction(tx);
      if (success) {
        this.events.emit(
          "mempool-transaction-added",
          tx
        );
        log.trace(`Transaction added to mempool: ${tx.data.hash}`);
      } else {
        log.error(`Transaction ${tx.data.hash} rejected: already exists in mempool`);
      }

      return success;
    }

    log.error(
      `Validation of tx ${tx.data.hash} failed:`,
      `${error ?? "unknown error"}`
    );

    throw new Error(
      `Validation of tx ${tx.data.hash} failed: ${error ?? "unknown error"}`
    );
  }

  private get unprovenQueue(): BlockStorage {
    return this.sequencer.dependencyContainer.resolve<BlockStorage>(
      "BlockStorage"
    );
  }

  public async getStagedNetworkState(): Promise<NetworkState | undefined> {
    const result = await this.unprovenQueue.getLatestBlock();
    return result?.result.afterNetworkState;
  }

  public async removeTxs(included: string[], dropped: string[]) {
    await this.transactionStorage.removeTx(included, "included");
    await this.transactionStorage.removeTx(dropped, "dropped");
  }

  @trace("mempool.get_txs")
  public async getTxs(limit?: number): Promise<PendingTransaction[]> {
    // TODO Add limit to the storage (or do something smarter entirely)
    const txs = await this.transactionStorage.getPendingUserTransactions();

    const baseCachedStateService = new CachedStateService(this.stateService);

    // Should provide ProvableNetworkState to checkTxValid.
    const stagedNetworkState = await this.getStagedNetworkState();

    const networkState =
      stagedNetworkState || ProvableNetworkState.toJSON(ProvableNetworkState.empty());

    const validationEnabled = this.config.validationEnabled ?? false;
    const sortedTxs = validationEnabled
      ? await this.checkTxValid(
          txs,
          baseCachedStateService,
          this.protocol.stateServiceProvider,
          networkState,
          limit
        )
      : txs.slice(0, limit);

    this.protocol.stateServiceProvider.popCurrentStateService();
    return sortedTxs;
  }

  // We iterate through the transactions. For each tx we run the account state hook.
  // If the txs succeeds then it can be returned. If it fails then we keep track of it
  // in the skipped txs list and when later txs succeed we check to see if any state transition
  // paths are shared between the just succeeded tx and any of the skipped txs. This is
  // because a failed tx may succeed now if the failure was to do with a nonce issue, say.
  // TODO Refactor
  @trace("mempool.validate_txs")
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async checkTxValid(
    transactions: PendingTransaction[],
    baseService: CachedStateService,
    stateServiceProvider: StateServiceProvider,
    networkState: NetworkState,
    limit?: number
  ) {
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );
    executionContext.clear();

    // Initialize starting state
    const sortedTransactions: PendingTransaction[] = [];
    const skippedTransactions: Record<string, MempoolTransactionPaths> = {};

    let queue: PendingTransaction[] = [...transactions];

    const previousBlock = await this.unprovenQueue.getLatestBlock();

    // TODO This is not sound currently as the prover state changes all the time
    //  in the actual blockprover. We need to properly simulate that
    const proverState: ProvableHookBlockState = {
      blockHashRoot: Field(
        previousBlock?.result.blockHashRoot ?? BlockHashMerkleTree.EMPTY_ROOT
      ),
      eternalTransactionsHash:
        previousBlock?.block.toEternalTransactionsHash !== undefined
          ? Field(previousBlock?.block.toEternalTransactionsHash)
          : Field(0),
      transactionsHash:
        previousBlock?.block.transactionsHash !== undefined
          ? Field(previousBlock?.block.transactionsHash)
          : Field(0),
      incomingMessagesHash:
        previousBlock?.block.toMessagesHash !== undefined
          ? Field(previousBlock?.block.toMessagesHash)
          : Field(0),
    };

    const provableNetworkState = new ProvableNetworkState(
      ProvableNetworkState.fromJSON(networkState)
    );

    while (
      queue.length > 0 &&
      sortedTransactions.length < (limit ?? Number.MAX_VALUE)
    ) {
      const [tx] = queue.splice(0, 1);
      const txStateService = new CachedStateService(baseService);
      stateServiceProvider.setCurrentStateService(txStateService);
      const contextInputs: RuntimeMethodExecutionData = {
        networkState: provableNetworkState,
        transaction: tx.toProtocolTransaction().transaction,
      };
      executionContext.setup(contextInputs);

      const signedTransaction = tx.toProtocolTransaction();

      // eslint-disable-next-line no-await-in-loop
      await this.accountStateHook.beforeTransaction({
        networkState: provableNetworkState,
        transaction: signedTransaction.transaction,
        signature: signedTransaction.signature,
        prover: proverState,
      });
      const { status, statusMessage, stateTransitions } =
        executionContext.current().result;

      if (status.toBoolean()) {
        log.trace(`Accepted tx ${tx.data.hash}`);
        sortedTransactions.push(tx);
        // eslint-disable-next-line no-await-in-loop
        await txStateService.applyStateTransitions(stateTransitions);
        // eslint-disable-next-line no-await-in-loop
        await txStateService.mergeIntoParent();
        delete skippedTransactions[tx.data.hash];
        if (Object.entries(skippedTransactions).length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          stateTransitions.forEach((st) => {
            Object.values(skippedTransactions).forEach((value) => {
              if (value.paths.some((x) => x === st.path.toString())) {
                queue.push(value.transaction);
              }
            });
          });
          queue = queue.filter(distinctByPredicate((a, b) => a === b));
        }
      } else {
        // eslint-disable-next-line no-await-in-loop
        const removeTxWhen = await this.accountStateHook.removeTransactionWhen({
          networkState: provableNetworkState,
          transaction: signedTransaction.transaction,
          signature: signedTransaction.signature,
          prover: proverState,
        });
        if (removeTxWhen) {
          // eslint-disable-next-line no-await-in-loop
          await this.transactionStorage.removeTx([tx.data.hash], "dropped");
          log.trace(
            `Deleting tx ${tx.data.hash}  from mempool because removeTransactionWhen condition is satisfied`
          );
          // eslint-disable-next-line no-continue
          continue;
        }

        log.trace(`Skipped tx ${tx.data.hash} because ${statusMessage}`);
        if (!(tx.data.hash in skippedTransactions)) {
          skippedTransactions[tx.data.hash] = {
            transaction: tx,
            paths: stateTransitions
              .map((x) => x.path)
              .filter((id, idx, arr) => arr.indexOf(id) === idx)
              .map((f) => f.toString()),
          };
        }
        stateServiceProvider.popCurrentStateService();
      }

      executionContext.clear();
    }
    return sortedTransactions;
  }

  public async start(): Promise<void> {
    noop();
  }
}
