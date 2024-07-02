import {
  BlockProducerModule,
  LocalTaskWorkerModule,
  PrivateMempool,
  SequencerModulesRecord,
  UnprovenProducerModule,
  VanillaTaskWorkerModules,
  TaskQueue,
  BaseLayer,
  BlockTrigger,
  DatabasePruneModule,
  Database,
} from "@proto-kit/sequencer";
import { TypedClass, ModulesConfig } from "@proto-kit/common";

type PreconfiguredSimpleSequencerModulesRecord = {
  Mempool: typeof PrivateMempool;
  BlockProducerModule: typeof BlockProducerModule;
  UnprovenProducerModule: typeof UnprovenProducerModule;
  DatabasePruneModule: typeof DatabasePruneModule;
};

export type SimpleSequencerModulesRecord = {
  Database: TypedClass<Database>;
  TaskQueue: TypedClass<TaskQueue>;
  BaseLayer: TypedClass<BaseLayer>;
  BlockTrigger: TypedClass<BlockTrigger>;
  // SettlementModule: typeof SettlementModule;
} & PreconfiguredSimpleSequencerModulesRecord;

export type SimpleSequencerWorkerModulesRecord = {
  LocalTaskWorkerModule: TypedClass<
    LocalTaskWorkerModule<ReturnType<typeof VanillaTaskWorkerModules.allTasks>>
  >;
  TaskQueue: TypedClass<TaskQueue>;
};

export class SimpleSequencerModules {
  public static worker<
    QueueModule extends TaskQueue,
    SequencerModules extends SequencerModulesRecord,
  >(queue: TypedClass<QueueModule>, additionalModules: SequencerModules) {
    return {
      LocalTaskWorkerModule: LocalTaskWorkerModule.from(
        VanillaTaskWorkerModules.allTasks()
      ),
      TaskQueue: queue,
      ...additionalModules,
    } satisfies SimpleSequencerWorkerModulesRecord;
  }

  public static with<
    QueueModule extends TaskQueue,
    DatabaseModule extends Database,
    BaseLayerModule extends BaseLayer,
    SequencerModules extends SequencerModulesRecord,
    BlockTriggerModule extends BlockTrigger,
  >(
    queue: TypedClass<QueueModule>,
    database: TypedClass<DatabaseModule>,
    baselayer: TypedClass<BaseLayerModule>,
    trigger: TypedClass<BlockTriggerModule>,
    additionalModules: SequencerModules
  ) {
    return {
      Database: database,
      DatabasePruneModule,
      Mempool: PrivateMempool,
      BaseLayer: baselayer,
      BlockProducerModule: BlockProducerModule,
      UnprovenProducerModule: UnprovenProducerModule,
      BlockTrigger: trigger,
      TaskQueue: queue,
      ...additionalModules,
    } satisfies SimpleSequencerModulesRecord;
  }

  public static defaultConfig() {
    return {
      UnprovenProducerModule: {
        allowEmptyBlock: true,
      },

      Mempool: {},
      BlockProducerModule: {},
      DatabasePruneModule: {
        pruneOnStartup: false,
      },
    } satisfies ModulesConfig<PreconfiguredSimpleSequencerModulesRecord>;
  }

  public static defaultWorkerConfig() {
    return {
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
    } satisfies ModulesConfig<
      Pick<SimpleSequencerWorkerModulesRecord, "LocalTaskWorkerModule">
    >;
  }
}
