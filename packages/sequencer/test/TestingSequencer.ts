import { TypedClass } from "@proto-kit/common";

import {
  BatchProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  WorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  SequencerModulesRecord,
  TaskWorkerModulesRecord,
  BlockProducerModule,
  VanillaTaskWorkerModules,
  SequencerStartupModule,
} from "../src";
import { ConstantFeeStrategy } from "../src/protocol/baselayer/fees/ConstantFeeStrategy";

export type DefaultTestingSequencerModules = {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  WorkerModule: TypedClass<WorkerModule<any>>;
  BaseLayer: typeof NoopBaseLayer;
  BatchProducerModule: typeof BatchProducerModule;
  BlockProducerModule: typeof BlockProducerModule;
  BlockTrigger: typeof ManualBlockTrigger;
  TaskQueue: typeof LocalTaskQueue;
  FeeStrategy: typeof ConstantFeeStrategy;
  SequencerStartupModule: typeof SequencerStartupModule;
};

export function testingSequencerModules<
  AdditionalModules extends SequencerModulesRecord,
  AdditionalTaskWorkerModules extends TaskWorkerModulesRecord,
>(
  modules: AdditionalModules,
  additionalTaskWorkerModules?: AdditionalTaskWorkerModules
) {
  const taskWorkerModule = WorkerModule.from({
    ...VanillaTaskWorkerModules.withoutSettlement(),
    ...additionalTaskWorkerModules,
  });

  const defaultModules = {
    Database: InMemoryDatabase,
    Mempool: PrivateMempool,
    BaseLayer: NoopBaseLayer,
    WorkerModule: taskWorkerModule,
    BatchProducerModule,
    BlockProducerModule,
    BlockTrigger: ManualBlockTrigger,
    TaskQueue: LocalTaskQueue,
    FeeStrategy: ConstantFeeStrategy,
    SequencerStartupModule,
  } satisfies DefaultTestingSequencerModules;

  return {
    ...defaultModules,
    ...modules,
    // We need to make sure that the taskworkermodule is initialized last
    WorkerModule: defaultModules.WorkerModule,
    SequencerStartupModule: defaultModules.SequencerStartupModule,
  } satisfies SequencerModulesRecord;
}
