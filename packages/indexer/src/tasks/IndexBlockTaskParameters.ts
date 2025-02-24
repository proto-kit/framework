import { BlockWithResult } from "@proto-kit/sequencer";
import {
  BlockMapper,
  BlockResultMapper,
  StateTransitionBatchArrayMapper,
  StateTransitionMapper,
  TransactionExecutionResultMapper,
  STBatchArrayMapOut1,
  STBatchArrayMapOut2,
} from "@proto-kit/persistance";
import { injectable } from "tsyringe";

export interface IndexBlockTaskParameters extends BlockWithResult {}

@injectable()
export class IndexBlockTaskParametersSerializer {
  public constructor(
    public blockMapper: BlockMapper,
    public blockResultMapper: BlockResultMapper,
    public transactionResultMapper: TransactionExecutionResultMapper,
    public stateTransitionBatchMapper: StateTransitionBatchArrayMapper,
    public stateTransitionMapper: StateTransitionMapper
  ) {}

  public toJSON(parameters: IndexBlockTaskParameters): string {
    return JSON.stringify({
      block: {
        ...this.blockMapper.mapOut(parameters.block),
        beforeBlockStateTransitions:
          parameters.block.beforeBlockStateTransitions.map((st) =>
            this.stateTransitionMapper.mapOut(st)
          ),
      },
      transactions: parameters.block.transactions.map((tx) => {
        const txMap = this.transactionResultMapper.mapOut(tx);
        const stBatches = this.stateTransitionBatchMapper.mapOut(
          tx.stateTransitions
        );
        return {
          ...txMap,
          stateTransitionBatch: stBatches.map(([batch, sts]) => ({
            applied: batch.applied,
            stateTransitions: sts,
          })),
        };
      }),
      result: {
        ...this.blockResultMapper.mapOut(parameters.result),
        afterBlockStateTransitions:
          parameters.result.afterBlockStateTransitions.map((st) =>
            this.stateTransitionMapper.mapOut(st)
          ),
      },
    });
  }

  public fromJSON(json: string): IndexBlockTaskParameters {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as {
      block: ReturnType<BlockMapper["mapOut"]> & {
        beforeBlockStateTransitions: ReturnType<
          StateTransitionMapper["mapOut"]
        >[];
      };
      transactions: (ReturnType<TransactionExecutionResultMapper["mapOut"]> & {
        stateTransitionBatch: (STBatchArrayMapOut1 & {
          stateTransitions: STBatchArrayMapOut2;
        })[];
      })[];
      result: ReturnType<BlockResultMapper["mapOut"]> & {
        afterBlockStateTransitions: ReturnType<
          StateTransitionMapper["mapOut"]
        >[];
      };
    };

    const transactions = parsed.transactions.map((tx) => {
      const txMapped = this.transactionResultMapper.mapIn(tx);
      const stBatch = tx.stateTransitionBatch.map<
        [STBatchArrayMapOut1, STBatchArrayMapOut2]
      >((batch) => [{ applied: batch.applied }, batch.stateTransitions]);
      return {
        ...txMapped,
        stateTransitions: this.stateTransitionBatchMapper.mapIn(stBatch),
      };
    });

    return {
      block: {
        ...this.blockMapper.mapIn(parsed.block),
        beforeBlockStateTransitions:
          parsed.block.beforeBlockStateTransitions.map((st) =>
            this.stateTransitionMapper.mapIn(st)
          ),
        transactions,
      },
      result: {
        ...this.blockResultMapper.mapIn(parsed.result),
        afterBlockStateTransitions:
          parsed.result.afterBlockStateTransitions.map((st) =>
            this.stateTransitionMapper.mapIn(st)
          ),
      },
    };
  }
}
