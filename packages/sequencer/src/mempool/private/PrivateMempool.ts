import { EventEmitter, log, noop } from "@proto-kit/common";
import { container, inject } from "tsyringe";
import {
  AccountStateHook,
  MandatoryProtocolModulesRecord,
  NetworkState,
  Protocol,
  RuntimeMethodExecutionContext,
} from "@proto-kit/protocol";

import type { Mempool, MempoolEvents } from "../Mempool";
import type { PendingTransaction } from "../PendingTransaction";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { TransactionStorage } from "../../storage/repositories/TransactionStorage";
import { TransactionValidator } from "../verification/TransactionValidator";
import { BlockQueue } from "../../storage/repositories/BlockStorage";
import {
  Sequencer,
  SequencerModulesRecord,
} from "../../sequencer/executor/Sequencer";
import { CachedStateService } from "../../state/state/CachedStateService";
import { AsyncStateService } from "../../state/async/AsyncStateService";

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
      this.protocol.dependencyContainer.resolve("AccountStateHook");
    this.stateService = stateService;
  }

  public async add(tx: PendingTransaction): Promise<boolean> {
    const [txValid, error] = this.transactionValidator.validateTx(tx);
    if (txValid) {
      const success = await this.transactionStorage.pushUserTransaction(tx);
      if (success) {
        this.events.emit("mempool-transaction-added", tx);
        log.info(
          `Transaction added to mempool: ${tx.hash().toString()} (${(await this.getTxs()).length} transactions in mempool)`
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

  private get unprovenQueue(): BlockQueue {
    return this.sequencer.dependencyContainer.resolve<BlockQueue>("BlockQueue");
  }

  public async getStagedNetworkState(): Promise<NetworkState | undefined> {
    const result = await this.unprovenQueue.getLatestBlock();
    return result?.result.afterNetworkState;
  }

  public async getTxs(): Promise<PendingTransaction[]> {
    const txs = await this.transactionStorage.getPendingUserTransactions();
    const sortedTxs: PendingTransaction[] = [];
    const skippedTxs: PendingTransaction[] = [];
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );
    const baseCachedStateService = new CachedStateService(this.stateService);
    this.protocol.stateServiceProvider.setCurrentStateService(
      baseCachedStateService
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const networkState = (await this.getStagedNetworkState()) as NetworkState;

    const checkTxValid = (transactions: PendingTransaction[]) => {
      for (const tx of transactions) {
        const txStateService = new CachedStateService(baseCachedStateService);
        this.protocol.stateServiceProvider.setCurrentStateService(
          txStateService
        );

        const signedTransaction = tx.toProtocolTransaction();
        this.accountStateHook.onTransaction({
          networkState: networkState,
          transaction: signedTransaction.transaction,
          signature: signedTransaction.signature,
        });
        const { status } = executionContext.current().result;
        if (status.toBoolean()) {
          sortedTxs.push(tx);
          txStateService.mergeIntoParent();
          if (skippedTxs.length > 0) {
            checkTxValid(skippedTxs);
          }
        } else {
          this.protocol.stateServiceProvider.popCurrentStateService();
          skippedTxs.push(tx);
        }
      }
    };
    checkTxValid(txs);
    this.protocol.stateServiceProvider.popCurrentStateService();
    return sortedTxs;
  }

  public async start(): Promise<void> {
    noop();
  }
}
