/* eslint-disable import/no-unused-modules */
/* eslint-disable max-classes-per-file */
import { container, Frequency, InjectionToken, Lifecycle } from "tsyringe";

export const errors = {
  configNotSet: (moduleName: string) =>
    new Error(
      `Trying to retrieve config of ${moduleName}, which was not yet set`
    ),

  configNotSetInContainer: (moduleName: string) =>
    new Error(
      `Trying to set config of ${moduleName}, but it was not yet set in the module container`
    ),

  onlyStringModuleNames: (moduleName: NonNullable<unknown>) =>
    new Error(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Only string module names, using ${typeof moduleName} instead: ${moduleName.toString()}`
    ),

  unableToDecorateModule: (moduleName: InjectionToken<unknown>) =>
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    new Error(`Unable to decorate module ${moduleName.toString()}`),
};

export type Preset<Config> = Config | ((...args: any[]) => Config);

export type Presets<Config> = Record<string, Preset<Config>>;

export class ConfigurableModule<Config> {
  protected currentConfig: Config | undefined;

  public get config(): Config {
    if (this.currentConfig === undefined) {
      throw errors.configNotSet(this.constructor.name);
    }
    return this.currentConfig;
  }

  public set config(config: Config) {
    this.currentConfig = config;
  }
}

export interface ConfigurableModuleClass<Config> {
  new (): ConfigurableModule<Config>;
  presets: Presets<Config>;
}

export function configurableModule() {
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  return <Config>(target: ConfigurableModuleClass<Config>) => {};
}

export type BaseModuleType = typeof ConfigurableModule<unknown>;
export interface ModulesRecord<
  ModuleType extends BaseModuleType = BaseModuleType
> {
  [name: string]: ModuleType;
}

export type ModulesConfig<Modules extends ModulesRecord> = Partial<{
  [ConfigKey in keyof Modules]: InstanceType<Modules[ConfigKey]>["config"];
}>;

export abstract class ModuleContainer<
  Modules extends ModulesRecord,
  Config extends ModulesConfig<Modules>
> {
  public static moduleDecorationFrequency: Frequency = "Once";

  public container = container.createChildContainer();

  public constructor(
    public definition: {
      modules: Modules;
      config?: Config;
    }
  ) {
    this.registerModules(definition.modules);
  }

  public abstract validateModule(
    containedModule: ConfigurableModule<unknown>
  ): void;

  public registerModules(
    modules: Record<string, typeof ConfigurableModule<unknown>>
  ) {
    Object.entries(modules).forEach(([moduleName, useClass]) => {
      this.container.register(
        moduleName,
        { useClass },
        { lifecycle: Lifecycle.ContainerScoped }
      );
      this.onAfterModuleResolution(moduleName);
    });
  }

  public registerValue<Value>(modules: Record<string, Value>) {
    Object.entries(modules).forEach(([moduleName, useValue]) => {
      this.container.register(moduleName, { useValue });
    });
  }

  public configure(config: Config) {
    this.definition.config = config;
  }

  public resolve<ModuleName extends keyof Modules>(
    moduleName: ModuleName
  ): Modules[ModuleName] {
    return this.container.resolve(this.moduleNameToString(moduleName));
  }

  public moduleNameToString<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string
  ): string {
    if (typeof moduleName !== "string") {
      throw errors.onlyStringModuleNames(moduleName);
    }

    return moduleName;
  }

  /**
   * Override this in the child class to provide custom
   * features or module checks
   */
  public decorateModule<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string,
    containedModule: InstanceType<Modules[ModuleName]>
  ) {
    const moduleNameString = this.moduleNameToString(moduleName);
    const config = this.definition.config?.[moduleNameString];

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!config) {
      throw errors.configNotSetInContainer(moduleNameString);
    }

    containedModule.config = config;
  }

  public onAfterModuleResolution<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string
  ) {
    container.afterResolution<InstanceType<Modules[ModuleName]>>(
      this.moduleNameToString(moduleName),
      (containedModuleName, containedModule) => {
        if (Array.isArray(containedModule)) {
          throw errors.unableToDecorateModule(containedModuleName);
        }
        this.decorateModule(moduleName, containedModule);
      },
      { frequency: ModuleContainer.moduleDecorationFrequency }
    );
  }
}

class RuntimeModule<Config> extends ConfigurableModule<Config> {
  public test = 5;
}

interface BalancesConfig {
  foo: number;
  // not available in default preset, must be provided by the user
  totalSupply: number;
}

@configurableModule()
export class Balances extends RuntimeModule<BalancesConfig> {
  public static presets = {
    default: (config: Omit<BalancesConfig, "foo">) => ({
      ...config,
      foo: 1,
    }),
  } satisfies Presets<BalancesConfig>;

  public foo() {
    console.log("foo", this.config.foo);
  }
}

interface AdminConfig {
  address: number;
}

@configurableModule()
export class Admin extends RuntimeModule<AdminConfig> {
  public static presets = {};

  public foo() {
    console.log("foo", this.config.address);
  }
}

class Runtime<
  Modules extends ModulesRecord<typeof RuntimeModule<unknown>>,
  Config extends ModulesConfig<Modules>
> extends ModuleContainer<Modules, Config> {
  public validateModule(containedModule: RuntimeModule<unknown>): void {}

  public override decorateModule<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string,
    containedModule: InstanceType<Modules[ModuleName]>
  ) {
    super.decorateModule(moduleName, containedModule);
  }
}

class Sequencer<
  Modules extends ModulesRecord,
  Config extends ModulesConfig<Modules>
> extends ModuleContainer<Modules, Config> {
  public validateModule(containedModule: ConfigurableModule<unknown>): void {}

  public start() {
    // start listening for tx and producing blocks
  }
}

const runtime = new Runtime({
  modules: {
    Balances,
    Admin,
  },

  config: {
    Balances: Balances.presets.default({
      totalSupply: 1,
    }),

    Admin: {
      address: 1,
    },
  },
});

const sequencer = new Sequencer({
  modules: {},
  config: {},
});

class AppChain<
  RuntimeModules extends ModulesRecord<typeof RuntimeModule<unknown>>,
  RuntimeModulesConfig extends ModulesConfig<RuntimeModules>,
  SequencerModules extends ModulesRecord,
  SequencerModulesConfig extends ModulesConfig<SequencerModules>
> {
  public constructor(
    public definition: {
      runtime: Runtime<RuntimeModules, RuntimeModulesConfig>;
      sequencer: Sequencer<SequencerModules, SequencerModulesConfig>;
    }
  ) {
    sequencer.registerValue({ runtime });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public configure(config: {
    runtime: RuntimeModulesConfig;
    sequencer: SequencerModulesConfig;
  }) {}

  public start() {
    const { runtime, sequencer } = this.definition;

    sequencer.registerValue({ runtime });

    sequencer.start();
  }
}

const appChain = new AppChain({ runtime, sequencer });

appChain.configure({
  sequencer: {},

  runtime: {
    Admin: {
      address: 1,
    },

    Balances: {
      foo: 1,
      totalSupply: 1,
    },
  },
});

appChain.start();
