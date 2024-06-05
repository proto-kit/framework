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
  public static with<SequencerModules extends SequencerModulesRecord>(
    additionalModules: SequencerModules
  ) {
    return {
      Database: InMemoryDatabase,
      Mempool: PrivateMempool,
      LocalTaskWorkerModule: LocalTaskWorkerModule.from(
        VanillaTaskWorkerModules.withoutSettlement()
      ),
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
