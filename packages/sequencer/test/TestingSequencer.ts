import { TypedClass } from "@proto-kit/common";

import {
  BatchProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
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
import { DefaultL1TransactionRetryStrategy } from "../src/settlement/transactions/DefaultL1TransactionRetryStrategy";

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
  SequencerStartupModule: typeof SequencerStartupModule;
  L1TransactionRetryStrategy: typeof DefaultL1TransactionRetryStrategy;
}

export function testingSequencerModules<
  AdditionalModules extends SequencerModulesRecord,
  AdditionalTaskWorkerModules extends TaskWorkerModulesRecord,
>(
  modules: AdditionalModules,
  additionalTaskWorkerModules?: AdditionalTaskWorkerModules
) {
  const taskWorkerModule = LocalTaskWorkerModule.from({
    ...VanillaTaskWorkerModules.withoutSettlement(),
    ...additionalTaskWorkerModules,
  });

  const defaultModules = {
    Database: InMemoryDatabase,
    Mempool: PrivateMempool,
    BaseLayer: NoopBaseLayer,
    LocalTaskWorkerModule: taskWorkerModule,
    BatchProducerModule,
    BlockProducerModule,
    BlockTrigger: ManualBlockTrigger,
    TaskQueue: LocalTaskQueue,
    FeeStrategy: ConstantFeeStrategy,
    SequencerStartupModule,
    L1TransactionRetryStrategy: DefaultL1TransactionRetryStrategy,
  } satisfies DefaultTestingSequencerModules;

  return {
    ...defaultModules,
    ...modules,
    // We need to make sure that the taskworkermodule is initialized last
    LocalTaskWorkerModule: defaultModules.LocalTaskWorkerModule,
    SequencerStartupModule: defaultModules.SequencerStartupModule,
  } satisfies SequencerModulesRecord;
}
