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

  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  public constructor(...args: any[]) {}

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
  new (...args: any[]): ConfigurableModule<Config>;
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

export type ModulesConfig<Modules extends ModulesRecord> = {
  [ConfigKey in keyof Modules]: InstanceType<Modules[ConfigKey]>["config"];
};

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

  public abstract validateModule<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string,
    containedModule: ConfigurableModule<unknown>
  ): void;

  public registerModules(modules: Modules) {
    for (const moduleName in modules) {
      if (Object.prototype.hasOwnProperty.call(modules, moduleName)) {
        this.container.register(
          moduleName,
          { useClass: modules[moduleName] },
          { lifecycle: Lifecycle.ContainerScoped }
        );
        this.onAfterModuleResolution(moduleName);
      }
    }
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
  ): InstanceType<Modules[ModuleName]> {
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
    this.container.afterResolution<InstanceType<Modules[ModuleName]>>(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      moduleName as InjectionToken,
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
