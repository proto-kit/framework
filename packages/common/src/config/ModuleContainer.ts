import "reflect-metadata";

import { container, Frequency, InjectionToken, Lifecycle } from "tsyringe";

import { StringKeyOf, TypedClass } from "../types";

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

  nonModuleDependency: (runtimeModuleName: string) =>
    new Error(`
  Unable to register module: ${runtimeModuleName}, attempting to inject a non-module dependency`),

  unknownDependency: (runtimeModuleName: string, name: string) =>
    new Error(
      `Unable to register module: ${runtimeModuleName}, 
      attempting to inject a dependency that is not registered 
      as a runtime module for this chain: ${name}`
    ),
};

// determines that a module should be configurable by default
export type BaseModuleType = TypedClass<Configurable<unknown>>;

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
  [ConfigKey in StringKeyOf<Modules>]: InstanceType<
    Modules[ConfigKey]
  > extends Configurable<infer Config>
    ? Config
    : never;
};

/**
 * Parameters required when creating a module container instance
 */
export interface ModuleContainerDefinition<Modules extends ModulesRecord> {
  modules: Modules;
  // config is optional, as it may be provided by the parent/wrapper class
  config?: ModulesConfig<Modules>;
}

/**
 * Reusable module container facilitating registration, resolution
 * configuration, decoration and validation of modules
 */
export class ModuleContainer<Modules extends ModulesRecord> {
  /**
   * Determines how often are modules decorated upon resolution
   * from the tsyringe DI container
   */
  private static readonly moduleDecorationFrequency: Frequency = "Once";

  // DI container holding all the registered modules
  protected readonly container = container.createChildContainer();

  public constructor(public definition: ModuleContainerDefinition<Modules>) {
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
  protected validateModule(
    moduleName: StringKeyOf<Modules>,
    containedModule: ConfigurableModule<unknown>
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const dependencies: { name?: string }[] | string[] | undefined =
      Reflect.getMetadata("design:paramtypes", containedModule);

    dependencies?.forEach((dependency: string | { name?: string }) => {
      const name =
        typeof dependency === "string" ? dependency : dependency.name;

      if (name === undefined) {
        throw errors.nonModuleDependency(moduleName);
      }

      if (!this.moduleNames.includes(name)) {
        throw errors.unknownDependency(moduleName, name);
      }
    });
  }

  /**
   * Assert that the iterated `moduleName` is of ModuleName type,
   * otherwise it may be just string e.g. when modules are iterated over
   * using e.g. a for loop.
   */
  protected isValidModuleName(
    modules: Modules,
    moduleName: string
  ): asserts moduleName is StringKeyOf<Modules> {
    if (!Object.prototype.hasOwnProperty.call(modules, moduleName)) {
      throw errors.onlyStringModuleNames(moduleName);
    }
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
        this.isValidModuleName(modules, moduleName);

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
  public configure(config: ModulesConfig<Modules>) {
    this.definition.config = config;
  }

  /**
   * Resolves a module from the current module container
   *
   * We have to narrow down the `ModuleName` type here to
   * `ResolvableModuleName`, otherwise the resolved value might
   * be any module instance, not the one specifically requested as argument.
   *
   * @param moduleName
   * @returns
   */
  public resolve<ResolvableModuleName extends StringKeyOf<Modules>>(
    moduleName: ResolvableModuleName
  ): InstanceType<Modules[ResolvableModuleName]> {
    return this.container.resolve<InstanceType<Modules[ResolvableModuleName]>>(
      moduleName
    );
  }

  /**
   * Override this in the child class to provide custom
   * features or module checks
   */
  protected decorateModule(
    moduleName: StringKeyOf<Modules>,
    containedModule: InstanceType<Modules[StringKeyOf<Modules>]>
  ) {
    const config = this.definition.config?.[moduleName];

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!config) {
      throw errors.configNotSetInContainer(moduleName.toString());
    }

    containedModule.config = config;
  }

  /**
   * Handle module resolution, e.g. by decorating resolved modules
   * @param moduleName
   */
  protected onAfterModuleResolution(moduleName: StringKeyOf<Modules>) {
    this.container.afterResolution<InstanceType<Modules[StringKeyOf<Modules>]>>(
      moduleName,
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
