/* eslint-disable @typescript-eslint/no-explicit-any,guard-for-in,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,max-len,etc/no-misused-generics */
import { container, injectable, Lifecycle, scoped, type DependencyContainer } from "tsyringe";
import {
  ComponentConfig,
  ConfigurationAggregator,
  RemoveUndefinedKeys,
  UninitializedComponentConfig,
} from "@yab/protocol";

import { isSequencerModulePropertyKey, SequencerModule } from "../builder/SequencerModule";
import {
  BuilderModulesType,
  BuilderResolvedModulesType,
  SequencerModulesType,
} from "../builder/types";

import { Sequenceable } from "./Sequenceable";

const errors = {
  missingDecorator: (name: string, className: string) =>
    new Error(
      `Unable to register module: ${name} / ${className}, did you forget to add @sequencerModule()?`
    ),
};

@injectable()
export class Sequencer<Modules extends SequencerModulesType>
  extends ConfigurationAggregator<Modules>
  implements Sequenceable<Modules>
{
  public static fromGlobalContainer<
    UnresolvedModules extends BuilderModulesType,
    ResolvedModules extends BuilderResolvedModulesType<UnresolvedModules>
  >(modules: UnresolvedModules): Sequencer<ResolvedModules> {
    return Sequencer.from<UnresolvedModules, ResolvedModules>(modules)(
      container.createChildContainer()
    );
  }

  public static from<
    UnresolvedModules extends BuilderModulesType,
    ResolvedModules extends BuilderResolvedModulesType<UnresolvedModules>
  >(modules: UnresolvedModules): (container: DependencyContainer) => Sequencer<ResolvedModules> {
    return (diContainer: DependencyContainer) => {
      // Register all modules
      for (const key in modules) {
        // Check if the decorator has been applied to the module's class
        const decoratorSet =
          Object.getOwnPropertyDescriptor(modules[key], isSequencerModulePropertyKey)?.value ===
          true;

        if (!decoratorSet) {
          throw errors.missingDecorator(key, modules[key].name);
        }

        diContainer.register(
          key,
          { useClass: modules[key] },
          { lifecycle: Lifecycle.ContainerScoped }
        );
      }

      // Build default config and resolve modules
      const resolvedModules: any = {};

      for (const key in modules) {
        const module: SequencerModule<unknown> = diContainer.resolve<SequencerModule<unknown>>(key);

        // We need to set the config here, in the case that a module requires no additional configuration, the config would be unset otherwise
        module.config = module.defaultConfig;

        resolvedModules[key] = module;
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return new Sequencer<ResolvedModules>(diContainer, resolvedModules as ResolvedModules);
    };
  }

  private config: UninitializedComponentConfig<ComponentConfig<Modules>>;

  public constructor(
    private readonly runtimeContainer: DependencyContainer,
    public readonly modules: Modules
  ) {
    super();
    this.config = Object.keys(modules).reduce<any>((config, key) => {
      config[key] = undefined;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return config;
    }, {});
  }

  public configure(config: RemoveUndefinedKeys<ComponentConfig<Modules>>) {
    this.config = this.applyConfig(this.modules, this.config, config);
  }

  public async start() {
    for (const key in this.modules) {
      const module = this.modules[key];

      // eslint-disable-next-line no-await-in-loop
      await module.start();
    }
  }
}