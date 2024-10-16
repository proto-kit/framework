import { EventEmitter, log, noop } from "@proto-kit/common";
import { container, inject } from "tsyringe";
import {
  AccountStateHook,
  MandatoryProtocolModulesRecord,
  NetworkState,
  Protocol,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  StateServiceProvider,
} from "@proto-kit/protocol";
import { Field } from "o1js";

import type { Mempool, MempoolEvents } from "../Mempool";
import type { PendingTransaction } from "../PendingTransaction";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { TransactionStorage } from "../../storage/repositories/TransactionStorage";
import { TransactionValidator } from "../verification/TransactionValidator";
import { BlockStorage } from "../../storage/repositories/BlockStorage";
import {
  Sequencer,
  SequencerModulesRecord,
} from "../../sequencer/executor/Sequencer";
import { CachedStateService } from "../../state/state/CachedStateService";
import { AsyncStateService } from "../../state/async/AsyncStateService";
import { distinctByPredicate } from "../../helpers/utils";

type MempoolTransactionPaths = {
  transaction: PendingTransaction;
  paths: Field[];
};
@sequencerModule()
export class PrivateMempool extends SequencerModule implements Mempool {
  public readonly events = new EventEmitter<MempoolEvents>();

  private readonly accountStateHook: AccountStateHook;

  public constructor(
    private readonly transactionValidator: TransactionValidator,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("Sequencer")
    private readonly sequencer: Sequencer<SequencerModulesRecord>,
    @inject("UnprovenStateService")
    private readonly stateService: AsyncStateService
  ) {
    super();
    this.accountStateHook =
      this.protocol.dependencyContainer.resolve("AccountState");
  }

  public async add(tx: PendingTransaction): Promise<boolean> {
    const [txValid, error] = this.transactionValidator.validateTx(tx);
    if (txValid) {
      const success = await this.transactionStorage.pushUserTransaction(tx);
      if (success) {
        this.events.emit("mempool-transaction-added", tx);
        log.trace(
          `Transaction added to mempool: ${tx.hash().toString()} (${(await this.transactionStorage.getPendingUserTransactions()).length} transactions in mempool)`
        );
      } else {
        log.error(
          `Transaction ${tx.hash().toString()} rejected: already exists in mempool`
        );
      }

      return success;
    }

    log.error(
      `Validation of tx ${tx.hash().toString()} failed:`,
      `${error ?? "unknown error"}`
    );

    throw new Error(
      `Validation of tx ${tx.hash().toString()} failed: ${error ?? "unknown error"}`
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

  public async getTxs(): Promise<PendingTransaction[]> {
    const txs = await this.transactionStorage.getPendingUserTransactions();
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );
    const baseCachedStateService = new CachedStateService(this.stateService);

    const networkState =
      (await this.getStagedNetworkState()) ?? NetworkState.empty();

    const sortedTxs = await this.checkTxValid(
      txs,
      baseCachedStateService,
      this.protocol.stateServiceProvider,
      networkState,
      executionContext
    );
    this.protocol.stateServiceProvider.popCurrentStateService();
    return sortedTxs;
  }

  public async start(): Promise<void> {
    noop();
  }

  // We iterate through the transactions. For each tx we run the account state hook.
  // If the txs succeeds then it can be returned. If it fails then we keep track of it
  // in the skipped txs list and when later txs succeed we check to see if any state transition
  // paths are shared between the just succeeded tx and any of the skipped txs. This is
  // because a failed tx may succeed now if the failure was to do with a nonce issue, say.
  private async checkTxValid(
    transactions: PendingTransaction[],
    baseService: CachedStateService,
    stateServiceProvider: StateServiceProvider,
    networkState: NetworkState,
    executionContext: RuntimeMethodExecutionContext
  ): Promise<PendingTransaction[]> {
    const skippedTransactions: Record<string, MempoolTransactionPaths> = {};
    const sortedTransactions: PendingTransaction[] = [];
    let queue: PendingTransaction[] = [...transactions];

    while (queue.length > 0) {
      const [tx] = queue.splice(0, 1);
      const txStateService = new CachedStateService(baseService);
      stateServiceProvider.setCurrentStateService(txStateService);
      const contextInputs: RuntimeMethodExecutionData = {
        networkState: networkState,
        transaction: tx.toProtocolTransaction().transaction,
      };
      executionContext.clear();
      executionContext.setup(contextInputs);

      const signedTransaction = tx.toProtocolTransaction();
      // eslint-disable-next-line no-await-in-loop
      await this.accountStateHook.onTransaction({
        networkState: networkState,
        transaction: signedTransaction.transaction,
        signature: signedTransaction.signature,
      });
      const { status, statusMessage, stateTransitions } =
        executionContext.current().result;

      if (status.toBoolean()) {
        log.trace(`Accepted tx ${tx.hash().toString()}`);
        sortedTransactions.push(tx);
        // eslint-disable-next-line no-await-in-loop
        await txStateService.applyStateTransitions(stateTransitions);
        // eslint-disable-next-line no-await-in-loop
        await txStateService.mergeIntoParent();
        delete skippedTransactions[tx.hash().toString()];
        if (Object.entries(skippedTransactions).length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          stateTransitions.forEach((st) => {
            Object.values(skippedTransactions).forEach((value) => {
              if (value.paths.some((x) => x.equals(st.path))) {
                queue.push(value.transaction);
              }
            });
          });
          queue = queue.filter(distinctByPredicate((a, b) => a === b));
        }
      } else {
        log.trace(
          `Skipped tx ${tx.hash().toString()} because ${statusMessage}`
        );
        if (!(tx.hash().toString() in skippedTransactions)) {
          skippedTransactions[tx.hash().toString()] = {
            transaction: tx,
            paths: stateTransitions
              .map((x) => x.path)
              .filter((id, idx, arr) => arr.indexOf(id) === idx),
          };
        }
        stateServiceProvider.popCurrentStateService();
      }
    }
    return sortedTransactions;
  }
}
