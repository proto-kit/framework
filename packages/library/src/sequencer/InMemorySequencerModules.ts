import {
  BatchProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  SequencerModulesRecord,
  UnprovenProducerModule,
  VanillaTaskWorkerModules,
  TaskWorkerModulesWithoutSettlement,
} from "@proto-kit/sequencer";
import { TypedClass } from "@proto-kit/common";

export type InMemorySequencerModulesRecord = {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  LocalTaskWorkerModule: TypedClass<
    LocalTaskWorkerModule<TaskWorkerModulesWithoutSettlement>
  >;
  BaseLayer: typeof NoopBaseLayer;
  BatchProducerModule: typeof BatchProducerModule;
  UnprovenProducerModule: typeof UnprovenProducerModule;
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
      LocalTaskWorkerModule: LocalTaskWorkerModule.from({
        ...VanillaTaskWorkerModules.withoutSettlement(),
      }),
      BaseLayer: NoopBaseLayer,
      BatchProducerModule: BatchProducerModule,
      UnprovenProducerModule: UnprovenProducerModule,
      BlockTrigger: ManualBlockTrigger,
      TaskQueue: LocalTaskQueue,
      // SettlementModule: SettlementModule,
      ...additionalModules,
    } satisfies InMemorySequencerModulesRecord;
  }
}
