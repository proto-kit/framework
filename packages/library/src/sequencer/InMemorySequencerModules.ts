import {
  BatchProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  WorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  SequencerModulesRecord,
  BlockProducerModule,
  VanillaTaskWorkerModules,
  TaskWorkerModulesWithoutSettlement,
  SequencerStartupModule,
  ConstantFeeStrategy,
} from "@proto-kit/sequencer";
import { TypedClass } from "@proto-kit/common";

export type InMemorySequencerModulesRecord = {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  WorkerModule: TypedClass<WorkerModule<TaskWorkerModulesWithoutSettlement>>;
  BaseLayer: typeof NoopBaseLayer;
  BatchProducerModule: typeof BatchProducerModule;
  BlockProducerModule: typeof BlockProducerModule;
  BlockTrigger: typeof ManualBlockTrigger;
  TaskQueue: typeof LocalTaskQueue;
  // SettlementModule: typeof SettlementModule;
};

// TODO Delete
export class InMemorySequencerModules {
  public static with<SequencerModules extends SequencerModulesRecord>(
    additionalModules: SequencerModules
  ) {
    return {
      Database: InMemoryDatabase,
      Mempool: PrivateMempool,
      WorkerModule: WorkerModule.from({
        ...VanillaTaskWorkerModules.withoutSettlement(),
      }),
      FeeStrategy: ConstantFeeStrategy,
      BaseLayer: NoopBaseLayer,
      BatchProducerModule,
      BlockProducerModule,
      BlockTrigger: ManualBlockTrigger,
      TaskQueue: LocalTaskQueue,
      // SettlementModule: SettlementModule,
      SequencerStartupModule: SequencerStartupModule,
      ...additionalModules,
    } satisfies InMemorySequencerModulesRecord;
  }
}
