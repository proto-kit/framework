/* eslint-disable max-lines */
import "reflect-metadata";

import {
  DependencyContainer,
  Frequency,
  InjectionToken,
  Lifecycle,
} from "tsyringe";
import log from "loglevel";

import { StringKeyOf, TypedClass } from "../types";
import { DependencyFactory } from "../dependencyFactory/DependencyFactory";

import { Configurable, ConfigurableModule } from "./ConfigurableModule";
import { ChildContainerProvider } from "./ChildContainerProvider";
import { ChildContainerStartable } from "./ChildContainerStartable";

const errors = {
  configNotSetInContainer: (moduleName: string) =>
    new Error(
      `Trying to get config of ${moduleName}, but it was not yet set in the module container`
    ),

  onlyValidModuleNames: (moduleName: NonNullable<unknown>) =>
    new Error(
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-base-to-string,@typescript-eslint/restrict-template-expressions
      `Only known module names are allowed, using unknown module name: ${moduleName}`
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

export const ModuleContainerErrors = errors;

// determines that a module should be configurable by default
export type BaseModuleType = TypedClass<
  ChildContainerStartable & Configurable<unknown>
>;

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
export class ModuleContainer<
  Modules extends ModulesRecord
> extends ConfigurableModule<unknown> {
  /**
   * Determines how often are modules decorated upon resolution
   * from the tsyringe DI container
   */
  private static readonly moduleDecorationFrequency: Frequency = "Once";

  // DI container holding all the registered modules
  private providedContainer?: DependencyContainer = undefined;

  public constructor(public definition: ModuleContainerDefinition<Modules>) {
    super();
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

  protected get container(): DependencyContainer {
    this.assertContainerInitialized(this.providedContainer);
    return this.providedContainer;
  }

  /**
   * Assert that the iterated `moduleName` is of ModuleName type,
   * otherwise it may be just string e.g. when modules are iterated over
   * using e.g. a for loop.
   */
  public assertIsValidModuleName(
    modules: Modules,
    moduleName: string
  ): asserts moduleName is StringKeyOf<Modules> {
    this.isValidModuleName(modules, moduleName);
  }

  public isValidModuleName(
    modules: Modules,
    moduleName: number | string | symbol
  ): asserts moduleName is StringKeyOf<Modules> {
    if (!Object.prototype.hasOwnProperty.call(modules, moduleName)) {
      throw errors.onlyValidModuleNames(moduleName);
    }
  }

  public assertContainerInitialized(
    container: DependencyContainer | undefined
  ): asserts container is DependencyContainer {
    if (container === undefined) {
      throw new Error(
        "DependencyContainer not set. Be sure to only call DI-related function in create() and not inside the constructor."
      );
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
        this.assertIsValidModuleName(modules, moduleName);

        log.debug(`Registering module: ${moduleName}`);

        const definitionEntry = modules[moduleName];

        this.container.register(
          moduleName,
          { useClass: definitionEntry },
          { lifecycle: Lifecycle.ContainerScoped }
        );
        this.onAfterModuleResolution(moduleName);
      }
    }
  }

  /**
   * Inject a set of dependencies using the given list of DependencyFactories
   * This method should be called during startup
   */
  protected registerDependencyFactories(
    factories: TypedClass<DependencyFactory>[]
  ) {
    factories.forEach((factory) => {
      this.container.resolve(factory).initDependencies(this.container);
    });
  }

  /**
   * Register a non-module value into the current container
   * @param modules
   */
  // eslint-disable-next-line no-warning-comments
  // TODO Rename to plural since object is param
  public registerValue<Value>(modules: Record<string, Value>) {
    Object.entries(modules).forEach(([moduleName, useValue]) => {
      this.container.register(moduleName, { useValue });
    });
  }

  protected registerClasses(modules: Record<string, TypedClass<unknown>>) {
    Object.entries(modules).forEach(([moduleName, useClass]) => {
      this.container.register(
        moduleName,
        { useClass },
        { lifecycle: Lifecycle.ContainerScoped }
      );
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

  public resolveOrFail<ModuleType>(
    moduleName: string,
    moduleType: TypedClass<ModuleType>
  ) {
    const instance = this.container.resolve<ModuleType>(moduleName);
    const isValidModuleInstance = instance instanceof moduleType;

    if (!isValidModuleInstance) {
      console.log(instance);
      throw new Error(
        `Incompatible module instance ("${moduleName}" not instanceof ${moduleType.name})`
      );
    }

    return instance;
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

        containedModule.create(() => {
          const container = this.container.createChildContainer();
          container.reset();
          return container;
        });
      },
      { frequency: ModuleContainer.moduleDecorationFrequency }
    );
  }

  /**
   * This is a placeholder for individual modules to override.
   * This method will be called whenever the underlying container fully
   * initialized
   */
  public create(childContainerProvider: ChildContainerProvider): void {
    this.providedContainer = childContainerProvider();

    // register all provided modules when the container is created
    this.registerModules(this.definition.modules);

    this.registerValue({
      ChildContainerProvider: () => this.container.createChildContainer(),
    });
  }
}
