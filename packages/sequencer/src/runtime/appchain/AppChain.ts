import { InMemoryStateService, ResolvedRuntimeModules, Runtime, RuntimeModules } from "@yab/module";
import { ComponentConfig, RemoveUndefinedKeys } from "@yab/protocol";

import { SequencerModulesType } from "../builder/Types";
import { Sequencer } from "../executor/Sequencer";
import { GraphQLServerModule } from "../../graphql/GraphqlSequencerModule";

interface AppChainDefinition<SequencerModules extends SequencerModulesType, RuntimeConfig extends RuntimeModules> {
  sequencer: Sequencer<SequencerModules>;
  runtime: Runtime<RuntimeConfig>;
}

type ConsumableRuntimeConfig<RuntimeConfig extends RuntimeModules> = RemoveUndefinedKeys<
  ComponentConfig<ResolvedRuntimeModules<RuntimeConfig>>
>;

interface AppChainConfig<SequencerModules extends SequencerModulesType, RuntimeConfig extends RuntimeModules> {
  sequencer: RemoveUndefinedKeys<ComponentConfig<SequencerModules>>;
  runtime: ConsumableRuntimeConfig<RuntimeConfig>;
}

// eslint-disable-next-line import/no-unused-modules
export class AppChain<SequencerModules extends SequencerModulesType, RuntimeConfig extends RuntimeModules> {
  public static from<SequencerModules extends SequencerModulesType, RuntimeConfig extends RuntimeModules>(
    definition: AppChainDefinition<SequencerModules, RuntimeConfig>
  ) {
    return new AppChain(definition);
  }

  public constructor(private readonly definition: AppChainDefinition<SequencerModules, RuntimeConfig>) {}

  public config(appChainConfig: AppChainConfig<SequencerModules, RuntimeConfig>) {
    this.sequencer.config(appChainConfig.sequencer);
    this.runtime.config(appChainConfig.runtime);
  }

  public sequencerConfig(config: AppChainConfig<SequencerModules, RuntimeConfig>["sequencer"]) {
    this.sequencer.config(config);
  }

  public genesisConfig(config: AppChainConfig<SequencerModules, RuntimeConfig>["runtime"]) {
    this.runtime.config(config);
  }

  // Is using getters inside the class a pattern we want to no do?
  public get sequencer(): Sequencer<SequencerModules> {
    return this.definition.sequencer;
  }

  public get runtime(): Runtime<RuntimeConfig> {
    return this.definition.runtime;
  }

  public async start(): Promise<void> {
    this.runtime.precompile();

    // Exposed Runtime to the sequencer DI container
    this.sequencer.container.register("Runtime", { useValue: this.runtime });

    if (this.runtime.areProofsEnabled) {
      await this.runtime.compile();
    }

    await this.sequencer.start();
  }
}

function test() {
  const appChain = AppChain.from({
    sequencer: Sequencer.from({
      graphql: GraphQLServerModule,
    }),

    runtime: Runtime.from({
      runtimeModules: {
        // admin: Admin
      },

      state: new InMemoryStateService(),
    }),
  });

  appChain.config({
    sequencer: {
      graphql: {
        port: 8080,
      },
    },

    runtime: {
      // admin: {
      //   publicKey: "123"
      // }
    },
  });
}
