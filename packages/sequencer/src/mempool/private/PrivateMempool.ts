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
      this.protocol.dependencyContainer.resolve("AccountState");
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
    console.log("EJ - tx Should be 6", txs.length);
    const checkTxValid = async (transactions: PendingTransaction[]) => {
      for await (const tx of transactions) {
        console.log("EJ - sender", tx.sender.toBase58());
        console.log("EJ - nonce", tx.nonce.toBigInt());

        const contextInputs: RuntimeMethodExecutionData = {
          networkState: networkState,
          transaction: tx.toProtocolTransaction().transaction,
        };
        executionContext.setup(contextInputs);

        const txStateService = new CachedStateService(baseCachedStateService);
        this.protocol.stateServiceProvider.setCurrentStateService(
          txStateService
        );

        const signedTransaction = tx.toProtocolTransaction();
        await this.accountStateHook.onTransaction({
          networkState: networkState,
          transaction: signedTransaction.transaction,
          signature: signedTransaction.signature,
        });
        const { status, statusMessage } = executionContext.current().result;
        console.log("EJ - status message", statusMessage);
        if (status.toBoolean()) {
          console.log("EJ - Boolean True");
          sortedTxs.push(tx);
          if (skippedTxs.includes(tx)) {
            console.log("EJ - skippedTxs includes tx", skippedTxs);
            skippedTxs.splice(skippedTxs.indexOf(tx), 1);
          }
          txStateService.mergeIntoParent();
          this.protocol.stateServiceProvider.popCurrentStateService();
          if (skippedTxs.length > 0) {
            console.log("EJ - skippedTxs", skippedTxs.length);
            checkTxValid(skippedTxs);
          }
        } else {
          console.log("EJ - Boolean False");
          this.protocol.stateServiceProvider.popCurrentStateService();
          skippedTxs.push(tx);
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
