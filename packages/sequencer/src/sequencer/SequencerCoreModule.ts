import {
  DependencyDeclaration,
  DependencyRecord,
  dependencyFactory,
  NoConfig,
} from "@proto-kit/common";
import { inject } from "tsyringe";

import {
  BlockConfig,
  BlockProducerModule,
} from "../protocol/production/sequencing/BlockProducerModule";
import { BatchProducerModule } from "../protocol/production/BatchProducerModule";

import { SequencerModule, sequencerModule } from "./builder/SequencerModule";
import { closeable } from "./builder/Closeable";
import { SequencerStartupModule } from "./SequencerStartupModule";

export interface LocalSequencerCoreDependencies extends DependencyRecord<LocalSequencerCoreModule> {
  SequencerStartupModule: DependencyDeclaration<
    SequencerStartupModule,
    LocalSequencerCoreModule
  >;
  BlockProducerModule: DependencyDeclaration<
    BlockProducerModule,
    LocalSequencerCoreModule
  >;
}

export interface SequencerCoreDependencies extends DependencyRecord<SequencerCoreModule> {
  SequencerStartupModule: DependencyDeclaration<
    SequencerStartupModule,
    SequencerCoreModule
  >;
  BlockProducerModule: DependencyDeclaration<
    BlockProducerModule,
    SequencerCoreModule
  >;
  BatchProducerModule: DependencyDeclaration<
    BatchProducerModule,
    SequencerCoreModule
  >;
}

export interface LocalSequencerCoreConfig {
  SequencerStartupModule?: NoConfig;
  BlockProducerModule?: BlockConfig;
}

export interface SequencerCoreConfig extends LocalSequencerCoreConfig {
  BatchProducerModule?: NoConfig;
}

const childConfigDefaults = {
  SequencerStartupModule: {},
  BlockProducerModule: {},
  BatchProducerModule: {},
} satisfies Required<SequencerCoreConfig>;

@sequencerModule()
@closeable()
@dependencyFactory()
export class LocalSequencerCoreModule extends SequencerModule<LocalSequencerCoreConfig> {
  public constructor(
    @inject("SequencerStartupModule")
    private readonly sequencerStartupModule: SequencerStartupModule,
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule
  ) {
    super();
  }

  public static dependencies(): LocalSequencerCoreDependencies {
    return {
      SequencerStartupModule: {
        useClass: SequencerStartupModule,
      },
      BlockProducerModule: {
        useClass: BlockProducerModule,
      },
    };
  }

  public create() {
    this.sequencerStartupModule.config =
      this.config.SequencerStartupModule ??
      childConfigDefaults.SequencerStartupModule;
    this.blockProducerModule.config =
      this.config.BlockProducerModule ??
      childConfigDefaults.BlockProducerModule;
  }

  public async start(): Promise<void> {
    await this.sequencerStartupModule.start();
    await this.blockProducerModule.start();
  }

  public async close(): Promise<void> {
    await this.sequencerStartupModule.close();
  }
}

@sequencerModule()
@dependencyFactory()
export class SequencerCoreModule extends SequencerModule<SequencerCoreConfig> {
  public constructor(
    @inject("SequencerStartupModule")
    private readonly sequencerStartupModule: SequencerStartupModule,
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule,
    @inject("BatchProducerModule")
    private readonly batchProducerModule: BatchProducerModule
  ) {
    super();
  }

  public static dependencies(): SequencerCoreDependencies {
    return {
      SequencerStartupModule: {
        useClass: SequencerStartupModule,
      },
      BlockProducerModule: {
        useClass: BlockProducerModule,
      },
      BatchProducerModule: {
        useClass: BatchProducerModule,
      },
    };
  }

  public create() {
    this.sequencerStartupModule.config =
      this.config.SequencerStartupModule ??
      childConfigDefaults.SequencerStartupModule;
    this.blockProducerModule.config =
      this.config.BlockProducerModule ??
      childConfigDefaults.BlockProducerModule;
    this.batchProducerModule.config =
      this.config.BatchProducerModule ??
      childConfigDefaults.BatchProducerModule;
  }

  public async start(): Promise<void> {
    await this.sequencerStartupModule.start();
    await this.blockProducerModule.start();
    await this.batchProducerModule.start();
  }
}
