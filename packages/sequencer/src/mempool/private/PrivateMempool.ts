import { EventEmitter, log, noop } from "@proto-kit/common";
import { container, inject } from "tsyringe";
import {
  AccountStateHook,
  MandatoryProtocolModulesRecord,
  NetworkState,
  Protocol,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
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
        log.info(
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
    const sortedTxs: PendingTransaction[] = [];
    const skippedTxs: Record<string, MempoolTransactionPaths> = {};
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );
    const baseCachedStateService = new CachedStateService(this.stateService);

    const networkState =
      (await this.getStagedNetworkState()) ?? NetworkState.empty();

    const checkTxValid = async (
      transactions: PendingTransaction[],
      reEvaluation: boolean = false
      // eslint-disable-next-line sonarjs/cognitive-complexity
    ) => {
      for (const tx of transactions) {
        const txStateService = new CachedStateService(baseCachedStateService);
        this.protocol.stateServiceProvider.setCurrentStateService(
          txStateService
        );
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
          log.info(`Accepted tx ${tx.hash().toString()}`);
          sortedTxs.push(tx);

          // eslint-disable-next-line no-await-in-loop
          await txStateService.applyStateTransitions(stateTransitions);
          // eslint-disable-next-line no-await-in-loop
          await txStateService.mergeIntoParent();
          this.protocol.stateServiceProvider.popCurrentStateService();
          delete skippedTxs[tx.hash().toString()];
          if (Object.entries(skippedTxs).length > 0) {
            const candidateMissedTxs: PendingTransaction[] = [];
            stateTransitions.forEach((st) => {
              Object.values(skippedTxs).forEach((value) => {
                if (value.paths.some((x) => x.equals(st.path))) {
                  candidateMissedTxs.push(value.transaction);
                }
              });
            });
            if (candidateMissedTxs.length > 0) {
              // eslint-disable-next-line no-await-in-loop
              await checkTxValid(candidateMissedTxs, true);
            }
          }
        } else {
          log.info(
            `Skipped tx ${tx.hash().toString()} because ${statusMessage}`
          );
          this.protocol.stateServiceProvider.popCurrentStateService();
          if (!reEvaluation) {
            skippedTxs[tx.hash().toString()] = {
              transaction: tx,
              paths: stateTransitions
                .map((x) => x.path)
                .filter((id, idx, arr) => arr.indexOf(id) === idx),
            };
          }
        }
      }
    };
    await checkTxValid(txs);
    this.protocol.stateServiceProvider.popCurrentStateService();
    return sortedTxs;
  }

  public async start(): Promise<void> {
    noop();
  }
}
