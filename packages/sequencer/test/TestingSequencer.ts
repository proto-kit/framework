import {
  BlockProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  SequencerModulesRecord,
  UnprovenProducerModule,
} from "../src";
import { TypedClass } from "@proto-kit/common";

export interface DefaultTestingSequencerModules extends SequencerModulesRecord {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  LocalTaskWorkerModule: typeof LocalTaskWorkerModule;
  BaseLayer: typeof NoopBaseLayer;
  BlockProducerModule: typeof BlockProducerModule;
  UnprovenProducerModule: typeof UnprovenProducerModule;
  BlockTrigger: typeof ManualBlockTrigger;
  TaskQueue: typeof LocalTaskQueue;
}

export function testingSequencerFromModules<AdditionalModules extends SequencerModulesRecord>(
  modules: AdditionalModules
): TypedClass<Sequencer<AdditionalModules & DefaultTestingSequencerModules>> {
  const defaultModules: DefaultTestingSequencerModules = {
    Database: InMemoryDatabase,
    Mempool: PrivateMempool,
    LocalTaskWorkerModule,
    BaseLayer: NoopBaseLayer,
    BlockProducerModule,
    UnprovenProducerModule,
    BlockTrigger: ManualBlockTrigger,
    TaskQueue: LocalTaskQueue,
  };

  return Sequencer.from({
    modules: {
      ...defaultModules,
      ...modules,
    },
  });
}
