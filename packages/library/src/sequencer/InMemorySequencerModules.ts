import {
  BlockProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  SequencerModulesRecord,
  UnprovenProducerModule,
  VanillaTaskWorkerModules,
  TaskWorkerModulesRecord,
} from "@proto-kit/sequencer";

export type InMemorySequencerModulesRecord = {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  LocalTaskWorkerModule: typeof LocalTaskWorkerModule;
  BaseLayer: typeof NoopBaseLayer;
  BlockProducerModule: typeof BlockProducerModule;
  UnprovenProducerModule: typeof UnprovenProducerModule;
  BlockTrigger: typeof ManualBlockTrigger;
  TaskQueue: typeof LocalTaskQueue;
  // SettlementModule: typeof SettlementModule;
};

export class InMemorySequencerModules {
  public static with<
    SequencerModules extends SequencerModulesRecord,
    AdditionalTasks extends TaskWorkerModulesRecord,
  >(
    additionalModules: SequencerModules,
    additionalTaskWorkerModules: AdditionalTasks
  ) {
    return {
      Database: InMemoryDatabase,
      Mempool: PrivateMempool,
      LocalTaskWorkerModule: LocalTaskWorkerModule.from({
        ...VanillaTaskWorkerModules.withoutSettlement(),
        ...additionalTaskWorkerModules,
      }),
      BaseLayer: NoopBaseLayer,
      BlockProducerModule: BlockProducerModule,
      UnprovenProducerModule: UnprovenProducerModule,
      BlockTrigger: ManualBlockTrigger,
      TaskQueue: LocalTaskQueue,
      // SettlementModule: SettlementModule,
      ...additionalModules,
    } satisfies InMemorySequencerModules;
  }
}
