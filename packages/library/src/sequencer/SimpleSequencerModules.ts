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
  Database,
  SequencerModule,
} from "@proto-kit/sequencer";
import { TypedClass, ModulesConfig } from "@proto-kit/common";

type PreconfiguredSimpleSequencerModulesRecord = {
  Mempool: typeof PrivateMempool;
  BlockProducerModule: typeof BlockProducerModule;
  UnprovenProducerModule: typeof UnprovenProducerModule;
};

export type MinimumAdditionalSequencerModules = {
  TaskQueue: TypedClass<TaskQueue & SequencerModule<unknown>>;
  Database: TypedClass<Database & SequencerModule<unknown>>;
  BaseLayer: TypedClass<BaseLayer & SequencerModule<unknown>>;
  BlockTrigger: TypedClass<BlockTrigger & SequencerModule<unknown>>;
  // We can't make this optional, therefore if this is not needed, a noop module should be provided
  DatabasePruneModule: TypedClass<SequencerModule<unknown>>;
  // SettlementModule: typeof SettlementModule;
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
    const {
      Database,
      BlockTrigger,
      TaskQueue,
      BaseLayer,
      DatabasePruneModule,
    } = additionalModules;
    /* eslint-enable @typescript-eslint/no-shadow */

    const modulesCopy: SequencerModulesRecord = { ...additionalModules };
    /* eslint-disable @typescript-eslint/dot-notation */
    delete modulesCopy["Database"];
    delete modulesCopy["TaskQueue"];
    delete modulesCopy["BaseLayer"];
    delete modulesCopy["BlockTrigger"];
    delete modulesCopy["DatabasePruneModule"];
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
      DatabasePruneModule,
      Mempool: PrivateMempool,
      BaseLayer,
      BlockProducerModule: BlockProducerModule,
      UnprovenProducerModule: UnprovenProducerModule,
      BlockTrigger,
      TaskQueue,
      ...reducedModules,
    } satisfies SimpleSequencerModulesRecord;
  }

  public static defaultConfig() {
    return {
      UnprovenProducerModule: {
        allowEmptyBlock: true,
      },

      Mempool: {},
      BlockProducerModule: {},
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
