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

export interface InMemorySequencerCoreDependencies extends DependencyRecord<InMemorySequencerCoreModule> {
  sequencerStartupModule: DependencyDeclaration<
    SequencerStartupModule,
    InMemorySequencerCoreModule
  >;
  blockProducerModule: DependencyDeclaration<
    BlockProducerModule,
    InMemorySequencerCoreModule
  >;
}

export interface SequencerCoreDependencies extends DependencyRecord<SequencerCoreModule> {
  sequencerStartupModule: DependencyDeclaration<
    SequencerStartupModule,
    SequencerCoreModule
  >;
  blockProducerModule: DependencyDeclaration<
    BlockProducerModule,
    SequencerCoreModule
  >;
  batchProducerModule: DependencyDeclaration<
    BatchProducerModule,
    SequencerCoreModule
  >;
}

export interface InMemorySequencerCoreConfig {
  SequencerStartupModule: NoConfig;
  BlockProducerModule: BlockConfig;
}

export interface SequencerCoreConfig extends InMemorySequencerCoreConfig {
  BatchProducerModule: NoConfig;
}

@sequencerModule()
@closeable()
@dependencyFactory()
export class InMemorySequencerCoreModule extends SequencerModule<InMemorySequencerCoreConfig> {
  public constructor(
    @inject("SequencerStartupModule")
    private readonly sequencerStartupModule: SequencerStartupModule,
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule
  ) {
    super();
  }

  public static dependencies(): InMemorySequencerCoreDependencies {
    return {
      sequencerStartupModule: {
        useClass: SequencerStartupModule,
      },
      blockProducerModule: {
        useClass: BlockProducerModule,
      },
    };
  }

  public async start(): Promise<void> {
    this.sequencerStartupModule.config = this.config.SequencerStartupModule;
    this.blockProducerModule.config = this.config.BlockProducerModule;

    await this.sequencerStartupModule.start();
    await this.blockProducerModule.start();
  }

  public async close(): Promise<void> {
    await this.sequencerStartupModule.close();
  }
}

@sequencerModule()
@closeable()
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
      sequencerStartupModule: {
        useClass: SequencerStartupModule,
      },
      blockProducerModule: {
        useClass: BlockProducerModule,
      },
      batchProducerModule: {
        useClass: BatchProducerModule,
      },
    };
  }

  public async start(): Promise<void> {
    this.sequencerStartupModule.config = this.config.SequencerStartupModule;
    this.blockProducerModule.config = this.config.BlockProducerModule;
    this.batchProducerModule.config = this.config.BatchProducerModule;

    await this.sequencerStartupModule.start();
    await this.blockProducerModule.start();
    await this.batchProducerModule.start();
  }

  public async close(): Promise<void> {
    await this.sequencerStartupModule.close();
  }
}
