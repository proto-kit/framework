import { TypedClass } from "@proto-kit/common";

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
  TaskWorkerModulesRecord,
  UnprovenProducerModule,
  VanillaTaskWorkerModules,
} from "../src";

export interface DefaultTestingSequencerModules extends SequencerModulesRecord {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  LocalTaskWorkerModule: TypedClass<LocalTaskWorkerModule<any>>;
  BaseLayer: typeof NoopBaseLayer;
  BlockProducerModule: typeof BlockProducerModule;
  UnprovenProducerModule: typeof UnprovenProducerModule;
  BlockTrigger: typeof ManualBlockTrigger;
  TaskQueue: typeof LocalTaskQueue;
}

export function testingSequencerFromModules<
  AdditionalModules extends SequencerModulesRecord,
  AdditionalTaskWorkerModules extends TaskWorkerModulesRecord
>(
  modules: AdditionalModules,
  additionalTaskWorkerModules?: AdditionalTaskWorkerModules
): TypedClass<Sequencer<DefaultTestingSequencerModules & AdditionalModules>> {
  const defaultModules: DefaultTestingSequencerModules = {
    Database: InMemoryDatabase,
    Mempool: PrivateMempool,
    LocalTaskWorkerModule: LocalTaskWorkerModule.from({
      ...VanillaTaskWorkerModules.withoutSettlement(),
      ...additionalTaskWorkerModules,
    }),
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
