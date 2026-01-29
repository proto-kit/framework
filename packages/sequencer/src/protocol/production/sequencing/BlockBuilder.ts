import { inject, injectable } from "tsyringe";
import {
  BeforeTransactionHookArguments,
  MandatoryProtocolModulesRecord,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableTransactionHook,
  StateServiceProvider,
  toBeforeTransactionHookArgument,
} from "@proto-kit/protocol";
import { log, mapSequential } from "@proto-kit/common";

import { Mempool } from "../../../mempool/Mempool";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { Tracer } from "../../../logging/Tracer";
import { trace } from "../../../logging/trace";

import {
  BlockTrackers,
  TransactionExecutionResultStatus,
  TransactionExecutionService,
} from "./TransactionExecutionService";
import { Ordering } from "./Ordering";

// TODO Allow user overriding of the blockbuilder
@injectable()
export class BlockBuilder {
  private readonly transactionHooks: ProvableTransactionHook<unknown>[];

  public constructor(
    private readonly executionService: TransactionExecutionService,
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider,
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>,
    @inject("Tracer") public readonly tracer: Tracer
  ) {
    this.transactionHooks = protocol.dependencyContainer.resolveAll(
      "ProvableTransactionHook"
    );
  }

  private async shouldRemove(
    state: CachedStateService,
    args: BeforeTransactionHookArguments
  ) {
    this.stateServiceProvider.setCurrentStateService(state);

    const returnValues = await mapSequential(this.transactionHooks, (hook) =>
      hook.removeTransactionWhen(args)
    );

    this.stateServiceProvider.popCurrentStateService();
    return returnValues.some((x) => x);
  }

  @trace("block.build")
  // eslint-disable-next-line sonarjs/cognitive-complexity
  public async buildBlock(
    asyncStateService: CachedStateService,
    networkState: NetworkState,
    state: BlockTrackers,
    maximumBlockSize: number
  ): Promise<{
    blockState: BlockTrackers;
    executionResults: TransactionExecutionResultStatus[];
  }> {
    let blockState = state;
    const exceptionExecutionResults: TransactionExecutionResultStatus[] = [];

    const networkStateHash = networkState.hash();

    const ordering = new Ordering(this.mempool, maximumBlockSize);

    let tx: PendingTransaction | undefined;
    // eslint-disable-next-line no-await-in-loop,no-cond-assign
    while ((tx = await ordering.requestNextTransaction()) !== undefined) {
      try {
        const newState = this.executionService.addTransactionToBlockProverState(
          BlockTrackers.clone(blockState),
          tx
        );

        // TODO Use RecordingStateService -> async asProver needed
        const recordingStateService = new CachedStateService(asyncStateService);

        // Create execution trace
        const executionTrace =
          // eslint-disable-next-line no-await-in-loop
          await this.executionService.createExecutionTrace(
            recordingStateService,
            tx,
            { networkState, hash: networkStateHash },
            blockState,
            newState
          );

        const transactionIncluded =
          executionTrace.hooksStatus.toBoolean() || executionTrace.tx.isMessage;

        let shouldRemove = false;
        if (transactionIncluded) {
          blockState = newState;

          // Only for successful hooks, messages will be included but progress thrown away
          if (executionTrace.hooksStatus.toBoolean()) {
            // eslint-disable-next-line no-await-in-loop
            await recordingStateService.mergeIntoParent();
          }
        } else {
          // Execute removeWhen to determine whether it should be dropped
          // eslint-disable-next-line no-await-in-loop
          shouldRemove = await this.shouldRemove(
            new CachedStateService(asyncStateService),
            toBeforeTransactionHookArgument(
              tx.toProtocolTransaction(),
              networkState,
              blockState
            )
          );

          const actionMessage = shouldRemove
            ? "removing as to removeWhen hooks"
            : "skipping";
          log.error(
            `Error in inclusion of tx, ${actionMessage}: Protocol hooks not executable: ${executionTrace.statusMessage ?? "unknown reason"}`
          );
        }

        ordering.reportResult({ result: executionTrace, shouldRemove });
      } catch (error) {
        if (error instanceof Error) {
          log.error("Error in inclusion of tx, dropping", error);
          exceptionExecutionResults.push({ tx, status: "shouldRemove" });
        }
      }
    }

    const orderingResults = ordering.getResults();

    return {
      blockState,
      executionResults: orderingResults.concat(...exceptionExecutionResults),
    };
  }
}
