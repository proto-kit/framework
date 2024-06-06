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
  AdditionalTaskWorkerModules extends TaskWorkerModulesRecord,
>(
  modules: AdditionalModules,
  additionalTaskWorkerModules?: AdditionalTaskWorkerModules
): TypedClass<Sequencer<DefaultTestingSequencerModules & AdditionalModules>> {
  const taskWorkerModule = LocalTaskWorkerModule.from({
    ...VanillaTaskWorkerModules.withoutSettlement(),
    ...additionalTaskWorkerModules,
  });

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const defaultModules: DefaultTestingSequencerModules = {
    Database: InMemoryDatabase,
    Mempool: PrivateMempool,
    BaseLayer: NoopBaseLayer,
    // LocalTaskWorkerModule: taskWorkerModule,
    BlockProducerModule,
    UnprovenProducerModule,
    BlockTrigger: ManualBlockTrigger,
    TaskQueue: LocalTaskQueue,
  } as DefaultTestingSequencerModules;

  return Sequencer.from({
    modules: {
      ...defaultModules,
      ...modules,
      // We need to make sure that the taskworkermodule is initialized last
      LocalTaskWorkerModule: taskWorkerModule,
    },
  });
}
