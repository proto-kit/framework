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
};

export class InMemorySequencerModules {
  public static with<SequencerModules extends SequencerModulesRecord>(
    additionalModules: SequencerModules
  ): InMemorySequencerModulesRecord & SequencerModules {
    return {
      Database: InMemoryDatabase,
      Mempool: PrivateMempool,
      LocalTaskWorkerModule: LocalTaskWorkerModule,
      BaseLayer: NoopBaseLayer,
      BlockProducerModule: BlockProducerModule,
      UnprovenProducerModule: UnprovenProducerModule,
      BlockTrigger: ManualBlockTrigger,
      TaskQueue: LocalTaskQueue,
      ...additionalModules,
    };
  }
}
