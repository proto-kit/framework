import { SequencerModulesRecord, Sequencer } from "@proto-kit/sequencer";
import { ModulesConfig, RecursivePartial } from "@proto-kit/common";
import { DefaultConfigs, DefaultModules } from "../modules";
import { definePreset } from "../modules/utils";

export class DefaultSequencer {
  static inmemory(options?: {
    overrideModules?: Partial<SequencerModulesRecord>;
    settlementEnabled?: boolean;
  }) {
    const modules = DefaultModules.ordered(
      definePreset(
        {
          ...DefaultModules.database(),
          ...DefaultModules.core({
            settlementEnabled: options?.settlementEnabled,
          }),
          ...DefaultModules.taskQueue(),
          ...(options?.settlementEnabled ? DefaultModules.settlement() : {}),
        },
        options?.overrideModules
      )
    );

    return Sequencer.from(modules);
  }
  static development(options?: {
    overrideModules?: Partial<SequencerModulesRecord>;
    settlementEnabled?: boolean;
  }) {
    const modules = DefaultModules.ordered(
      definePreset(
        {
          // ordering of the modules matters due to dependency resolution
          ...DefaultModules.database({ preset: "development" }),
          ...DefaultModules.databasePrune(),
          ...DefaultModules.metrics(),
          ...DefaultModules.taskQueue({ preset: "development" }),
          ...DefaultModules.core({
            settlementEnabled: options?.settlementEnabled,
          }),
          ...DefaultModules.sequencerIndexer(),
        },
        options?.overrideModules
      )
    );

    return Sequencer.from(modules);
  }
  static sovereign(options?: {
    overrideModules?: Partial<SequencerModulesRecord>;
    settlementEnabled?: boolean;
  }) {
    const modules = DefaultModules.ordered(
      definePreset(
        {
          // ordering of the modules matters due to dependency resolution
          ...DefaultModules.database(),
          ...DefaultModules.taskQueue(),
          ...DefaultModules.core({
            settlementEnabled: options?.settlementEnabled,
          }),
          ...DefaultModules.sequencerIndexer(),
          ...DefaultModules.metrics(),
          ...DefaultModules.databasePrune(),
        },
        options?.overrideModules
      )
    );

    return Sequencer.from(modules);
  }
}
export class DefaultSequencerConfig {
  static inmemory(options?: {
    overrideConfig?: RecursivePartial<ModulesConfig<any>>;
    settlementEnabled?: boolean;
  }) {
    return {
      ...DefaultConfigs.core({ settlementEnabled: options?.settlementEnabled }),
      ...DefaultConfigs.database({ preset: "inmemory" }),
      ...DefaultConfigs.taskQueue({ preset: "inmemory" }),
      ...options?.overrideConfig,
    };
  }
  static development(options?: {
    overrideConfig?: RecursivePartial<ModulesConfig<any>>;
    settlementEnabled?: boolean;
  }) {
    return {
      ...DefaultConfigs.core({
        settlementEnabled: options?.settlementEnabled,
        preset: "development",
      }),
      ...DefaultConfigs.sequencerIndexer(),
      ...DefaultConfigs.metrics({ preset: "development" }),
      ...DefaultConfigs.databasePrune({ preset: "development" }),
      ...DefaultConfigs.taskQueue({
        preset: "development",
        overrides: {
          ...DefaultConfigs.redis({
            preset: "development",
            overrides: { db: 1 },
          }),
        },
      }),
      ...DefaultConfigs.database({ preset: "development" }),
      ...options?.overrideConfig,
    };
  }
  static sovereign(options?: {
    overrideConfig?: RecursivePartial<ModulesConfig<any>>;
    settlementEnabled?: boolean;
  }) {
    return {
      ...DefaultConfigs.core({
        settlementEnabled: options?.settlementEnabled,
        preset: "sovereign",
      }),
      ...DefaultConfigs.sequencerIndexer(),
      ...DefaultConfigs.metrics({ preset: "sovereign" }),
      ...DefaultConfigs.databasePrune({ preset: "sovereign" }),
      ...DefaultConfigs.taskQueue({
        preset: "sovereign",
        overrides: {
          ...DefaultConfigs.redis({
            preset: "sovereign",
            overrides: { db: 1 },
          }),
        },
      }),
      ...DefaultConfigs.database({ preset: "sovereign" }),
      ...options?.overrideConfig,
    };
  }
}
