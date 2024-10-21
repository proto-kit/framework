import {
  BatchProducerModule,
  LocalTaskWorkerModule,
  PrivateMempool,
  SequencerModulesRecord,
  BlockProducerModule,
  VanillaTaskWorkerModules,
  TaskQueue,
  BaseLayer,
  BlockTrigger,
  Database,
  SequencerModule,
  ProtocolStartupModule,
} from "@proto-kit/sequencer";
import { TypedClass, ModulesConfig } from "@proto-kit/common";

type PreconfiguredSimpleSequencerModulesRecord = {
  Mempool: typeof PrivateMempool;
  BatchProducerModule: typeof BatchProducerModule;
  BlockProducerModule: typeof BlockProducerModule;
  ProtocolStartupModule: TypedClass<
    ProtocolStartupModule & SequencerModule<unknown>
  >;
};

export type MinimumAdditionalSequencerModules = {
  TaskQueue: TypedClass<TaskQueue & SequencerModule<unknown>>;
  Database: TypedClass<Database & SequencerModule<unknown>>;
  BaseLayer: TypedClass<BaseLayer & SequencerModule<unknown>>;
  BlockTrigger: TypedClass<BlockTrigger & SequencerModule<unknown>>;
};

export type SimpleSequencerModulesRecord = MinimumAdditionalSequencerModules &
  PreconfiguredSimpleSequencerModulesRecord;

export type AdditionalSequencerModules = SequencerModulesRecord &
  MinimumAdditionalSequencerModules;

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

  public static with<SequencerModules extends AdditionalSequencerModules>(
    additionalModules: SequencerModules
  ) {
    /* eslint-disable @typescript-eslint/no-shadow */
    const { Database, BlockTrigger, TaskQueue, BaseLayer } = additionalModules;
    /* eslint-enable @typescript-eslint/no-shadow */

    const modulesCopy: SequencerModulesRecord = { ...additionalModules };
    /* eslint-disable @typescript-eslint/dot-notation */
    delete modulesCopy["Database"];
    delete modulesCopy["TaskQueue"];
    delete modulesCopy["BaseLayer"];
    delete modulesCopy["BlockTrigger"];
    /* eslint-enable @typescript-eslint/dot-notation */
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const reducedModules = modulesCopy as Omit<
      SequencerModules,
      | "Database"
      | "TaskQueue"
      | "BaseLayer"
      | "BlockTrigger"
      | "DatabasePruneModule"
    >;

    return {
      Database,
      Mempool: PrivateMempool,
      BaseLayer,
      BatchProducerModule,
      BlockProducerModule,
      BlockTrigger,
      TaskQueue,
      ...reducedModules,
      ProtocolStartupModule,
    } satisfies SimpleSequencerModulesRecord;
  }

  public static defaultConfig() {
    return {
      BlockProducerModule: {
        allowEmptyBlock: true,
      },

      Mempool: {},
      BatchProducerModule: {},
      ProtocolStartupModule: {},
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
