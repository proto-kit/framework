import { inject, injectable } from "tsyringe";
import {
  InMemoryStateService,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { mapSequential } from "@proto-kit/common";
import { NetworkState, StateServiceProvider } from "@proto-kit/protocol";

import { PendingTransaction } from "../../../../mempool/PendingTransaction";
import { distinct } from "../../../../helpers/utils";
import {
  RuntimeAnalyzerService,
  RuntimeInfo,
} from "../../../runtime/RuntimeAnalyzerService";
import { TransactionUtils } from "../../utils/transaction-utils";
import { Tracer } from "../../../../logging/Tracer";
import { trace } from "../../../../logging/trace";

export type PreprocessedTransaction = {
  tx: PendingTransaction;
  dynamicKeyAccess: boolean;
  accessedStatePaths: bigint[];
};

@injectable()
export class TransactionPreprocessor {
  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>,
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider,
    @inject("Tracer")
    public readonly tracer: Tracer,
    private readonly runtimeAnalyzerService: RuntimeAnalyzerService
  ) {}

  @trace("block.preprocess.txs")
  public async batchPreprocess(
    txs: PendingTransaction[]
  ): Promise<PreprocessedTransaction[]> {
    this.setupStateService();
    const runtimeInfo = await this.runtimeAnalyzerService.getRuntimeInfo();

    const preprocessedTransactions = await mapSequential(txs, async (tx) => {
      return await this.preprocessSingleTransaction(tx, runtimeInfo);
    });

    this.stateServiceProvider.popCurrentStateService();

    return preprocessedTransactions;
  }

  public async preprocess(
    tx: PendingTransaction
  ): Promise<PreprocessedTransaction> {
    this.setupStateService();

    const preprocessedTransaction = await this.preprocessSingleTransaction(
      tx,
      await this.runtimeAnalyzerService.getRuntimeInfo()
    );

    this.stateServiceProvider.popCurrentStateService();

    return preprocessedTransaction;
  }

  private setupStateService() {
    this.stateServiceProvider.setCurrentStateService(
      new InMemoryStateService()
    );
  }

  private async preprocessSingleTransaction(
    tx: PendingTransaction,
    runtimeInfo: RuntimeInfo
  ): Promise<PreprocessedTransaction> {
    const { args, method, combinedMethodName } =
      await TransactionUtils.decodeTransaction(tx, this.runtime);
    const { dynamicKeyAccess } = runtimeInfo[combinedMethodName];

    if (!dynamicKeyAccess) {
      const result = await TransactionUtils.executeWithExecutionContext(
        async () => {
          await method(...args);
        },
        {
          transaction: tx.toRuntimeTransaction(),
          networkState: NetworkState.empty(),
        },
        true
      );

      return {
        tx,
        dynamicKeyAccess,
        accessedStatePaths: result.stateTransitions
          .map((x) => x.path.toBigInt())
          .filter(distinct),
      };
    } else {
      return {
        tx,
        dynamicKeyAccess,
        accessedStatePaths: [],
      };
    }
  }
}
