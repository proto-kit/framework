import "reflect-metadata";

import { container, Frequency, InjectionToken, Lifecycle } from "tsyringe";

import { TypedClassConstructor } from "../types";

import { Configurable, ConfigurableModule } from "./ConfigurableModule";

export const errors = {
  configNotSet: (moduleName: string) =>
    new Error(
      `Trying to retrieve config of ${moduleName}, which was not yet set`
    ),

  configNotSetInContainer: (moduleName: string) =>
    new Error(
      `Trying to get config of ${moduleName}, but it was not yet set in the module container`
    ),

  onlyStringModuleNames: (moduleName: NonNullable<unknown>) =>
    new Error(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Only string module names, using ${typeof moduleName} instead: ${moduleName.toString()}`
    ),

  unableToDecorateModule: (moduleName: InjectionToken<unknown>) =>
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    new Error(`Unable to decorate module ${moduleName.toString()}`),

  nonModuleDependecy: (runtimeModuleName: string) =>
    new Error(`
  Unable to register module: ${runtimeModuleName}, attempting to inject a non-module dependency`),

  unknownDependency: (runtimeModuleName: string, name: string) =>
    new Error(
      `Unable to register module: ${runtimeModuleName}, 
      attempting to inject a dependency that is not registred 
      as a runtime module for this chain: ${name}`
    ),
};

// determines that a module should be configurable by default
export type BaseModuleType = TypedClassConstructor<Configurable<unknown>>;

// allows to specify what kind of modules can be passed into a container
export interface ModulesRecord<
  // use the default configurable module type
  ModuleType extends BaseModuleType = BaseModuleType
> {
  [name: string]: ModuleType;
}

// config record derived from the provided modules and their config types
export type ModulesConfig<Modules extends ModulesRecord> = {
  // this will translate into = key: module name, value: module.config
  [ConfigKey in keyof Modules]: InstanceType<Modules[ConfigKey]>["config"];
};

/**
 * Parameters required when creating a module container instance
 */
export interface ModuleContainerDefinition<Modules, Config> {
  modules: Modules;
  // config is optional, as it may be provided by the parent/wrapper class
  config?: Config;
}

/**
 * Reusable module container facilitating registration, resolution
 * configuration, decoration and validation of modules
 */
export abstract class ModuleContainer<
  Modules extends ModulesRecord,
  Config extends ModulesConfig<Modules>
> {
  // determines how often are modules decorated upon resolution
  public static moduleDecorationFrequency: Frequency = "Once";

  // DI container holding all the registred modules
  public container = container.createChildContainer();

  public constructor(
    public definition: ModuleContainerDefinition<Modules, Config>
  ) {
    // register all provided modules when the container is created
    this.registerModules(definition.modules);
  }

  /**
   * @returns list of module names
   */
  public get moduleNames() {
    return Object.keys(this.definition.modules);
  }

  /**
   * Check if the provided module satisfies the container requirements,
   * such as only injecting other known modules.
   *
   * @param moduleName
   * @param containedModule
   */
  public validateModule<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string,
    containedModule: ConfigurableModule<unknown>
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const dependencies: { name?: string }[] | string[] | undefined =
      Reflect.getMetadata("design:paramtypes", containedModule);

    dependencies?.forEach((dependency: string | { name?: string }) => {
      const name =
        typeof dependency === "string" ? dependency : dependency.name;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!name) {
        throw errors.nonModuleDependecy(this.moduleNameToString(moduleName));
      }
      if (!this.moduleNames.includes(name)) {
        throw errors.unknownDependency(
          this.moduleNameToString(moduleName),
          name
        );
      }
    });
  }

  /**
   * Register modules into the current container, and registers
   * a respective resolution hook in order to decorate the module
   * upon/after resolution.
   *
   * @param modules
   */
  protected registerModules(modules: Modules) {
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

  /**
   * Register a non-module value into the current container
   * @param modules
   */
  public registerValue<Value>(modules: Record<string, Value>) {
    Object.entries(modules).forEach(([moduleName, useValue]) => {
      this.container.register(moduleName, { useValue });
    });
  }

  /**
   * Provide additional configuration after the ModuleContainer was created.
   *
   * Keep in mind that modules are only decorated once after they are resolved,
   * therefore applying any configuration must happen
   * before the first resolution.
   * @param config
   */
  public configure(config: Config) {
    this.definition.config = config;
  }

  /**
   * Resolves a module from the current module container
   * @param moduleName
   * @returns
   */
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
  protected decorateModule<ModuleName extends keyof Modules>(
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

  /**
   * Handle module resolution, e.g. by decorating resolved modules
   * @param moduleName
   */
  protected onAfterModuleResolution<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string
  ) {
    this.container.afterResolution<InstanceType<Modules[ModuleName]>>(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      moduleName as InjectionToken,
      (containedModuleName, containedModule) => {
        // special case where tsyringe may return multiple known instances (?)
        if (Array.isArray(containedModule)) {
          throw errors.unableToDecorateModule(containedModuleName);
        }
        this.decorateModule(moduleName, containedModule);
      },
      { frequency: ModuleContainer.moduleDecorationFrequency }
    );
  }
}
