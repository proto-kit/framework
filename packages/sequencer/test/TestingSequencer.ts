import { TypedClass } from "@proto-kit/common";

import {
  BatchProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  SequencerModulesRecord,
  TaskWorkerModulesRecord,
  BlockProducerModule,
  VanillaTaskWorkerModules,
  ProtocolStartupModule,
} from "../src";
import { ConstantFeeStrategy } from "../src/protocol/baselayer/fees/ConstantFeeStrategy";

export interface DefaultTestingSequencerModules extends SequencerModulesRecord {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  LocalTaskWorkerModule: TypedClass<LocalTaskWorkerModule<any>>;
  BaseLayer: typeof NoopBaseLayer;
  BatchProducerModule: typeof BatchProducerModule;
  BlockProducerModule: typeof BlockProducerModule;
  BlockTrigger: typeof ManualBlockTrigger;
  TaskQueue: typeof LocalTaskQueue;
  FeeStrategy: typeof ConstantFeeStrategy;
  ProtocolStartupModule: typeof ProtocolStartupModule;
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

  const defaultModules: DefaultTestingSequencerModules = {
    Database: InMemoryDatabase,
    Mempool: PrivateMempool,
    BaseLayer: NoopBaseLayer,
    // LocalTaskWorkerModule: taskWorkerModule,
    BatchProducerModule,
    BlockProducerModule,
    BlockTrigger: ManualBlockTrigger,
    TaskQueue: LocalTaskQueue,
    FeeStrategy: ConstantFeeStrategy,
  } as DefaultTestingSequencerModules;

  return Sequencer.from({
    modules: {
      ...defaultModules,
      ...modules,
      // We need to make sure that the taskworkermodule is initialized last
      LocalTaskWorkerModule: taskWorkerModule,
      ProtocolStartupModule: ProtocolStartupModule,
    },
  });
}
