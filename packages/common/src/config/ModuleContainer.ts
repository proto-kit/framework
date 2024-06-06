import "reflect-metadata";

import {
  DependencyContainer,
  Frequency,
  InjectionToken,
  instancePerContainerCachingFactory,
  isClassProvider,
  isFactoryProvider,
  isTokenProvider,
  isValueProvider,
  Lifecycle,
} from "tsyringe";
import log from "loglevel";
import merge from "lodash/merge";

import { MergeObjects, StringKeyOf, TypedClass } from "../types";
import {
  DependencyFactory,
  InferDependencies,
} from "../dependencyFactory/DependencyFactory";
import { EventEmitterProxy } from "../events/EventEmitterProxy";

import {
  Configurable,
  ConfigurableModule,
  NoConfig,
} from "./ConfigurableModule";
import { ChildContainerProvider } from "./ChildContainerProvider";
import { ChildContainerCreatable } from "./ChildContainerCreatable";

const errors = {
  configNotSetInContainer: (moduleName: string) =>
    new Error(
      `Trying to get config of ${moduleName}, but it was not yet set in the module container`
    ),

  onlyValidModuleNames: (moduleName: NonNullable<unknown>) =>
    new Error(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
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

  dependencyContainerNotSet: (className: string) =>
    new Error(
      `DependencyContainer not set. Be sure to only call DI-related function in create() and not inside the constructor. (${className})`
    ),

  validModuleInstance: (moduleName: string, moduleTypeName: string) =>
    new Error(
      `Incompatible module instance ("${moduleName}" not instanceof ${moduleTypeName})`
    ),
};

export const ModuleContainerErrors = errors;

export interface BaseModuleInstanceType
  extends ChildContainerCreatable,
    Configurable<unknown> {}

// determines that a module should be configurable by default
export type BaseModuleType = TypedClass<BaseModuleInstanceType>;

// allows to specify what kind of modules can be passed into a container
export interface ModulesRecord<
  // use the default configurable module type
  ModuleType extends BaseModuleType = BaseModuleType,
> {
  [name: string]: ModuleType;
}

// config record derived from the provided modules and their config types
export type ModulesConfig<Modules extends ModulesRecord> = {
  // this will translate into = key: module name, value: module.config
  [ConfigKey in StringKeyOf<Modules>]: InstanceType<
    Modules[ConfigKey]
  > extends Configurable<infer Config>
    ? Config extends NoConfig
      ? Config | undefined
      : Config
    : never;
};

/**
 * This type make any config partial (i.e. optional) up to the first level
 * So { Module: { a: { b: string } } }
 * will become
 * { Module?: { a?: { b: string } } }
 * Note that b does not become optional, as we don't want nested objects to
 * become unreasonably partialized (for example Field).
 */
export type RecursivePartial<T> = {
  [Key in keyof T]?: Partial<T[Key]>;
};

/**
 * Parameters required when creating a module container instance
 */
export interface ModuleContainerDefinition<Modules extends ModulesRecord> {
  modules: Modules;
  // config is optional, as it may be provided by the parent/wrapper class
  /**
   * @deprecated
   */
  config?: ModulesConfig<Modules>;
}

// Removes all keys with a "never" value from an object
export type FilterNeverValues<Type extends Record<string, unknown>> = {
  [Key in keyof Type as Type[Key] extends never ? never : Key]: Type[Key];
};

export type DependenciesFromModules<Modules extends ModulesRecord> =
  FilterNeverValues<{
    [Key in keyof Modules]: Modules[Key] extends TypedClass<DependencyFactory>
      ? InferDependencies<InstanceType<Modules[Key]>>
      : never;
  }>;

export type ResolvableModules<Modules extends ModulesRecord> = MergeObjects<
  DependenciesFromModules<Modules>
> &
  Modules;

/**
 * Reusable module container facilitating registration, resolution
 * configuration, decoration and validation of modules
 */
export class ModuleContainer<
  Modules extends ModulesRecord,
> extends ConfigurableModule<ModulesConfig<Modules>> {
  /**
   * Determines how often are modules decorated upon resolution
   * from the tsyringe DI container
   */
  private static readonly moduleDecorationFrequency: Frequency = "Once";

  // DI container holding all the registered modules
  private providedContainer?: DependencyContainer = undefined;

  private eventEmitterProxy: EventEmitterProxy<Modules> | undefined = undefined;

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
    moduleName: string
  ): asserts moduleName is StringKeyOf<Modules> {
    if (!this.isValidModuleName(this.definition.modules, moduleName)) {
      throw errors.onlyValidModuleNames(moduleName);
    }
  }

  public isValidModuleName(
    modules: Modules,
    moduleName: number | string | symbol
  ): moduleName is StringKeyOf<Modules> {
    return Object.prototype.hasOwnProperty.call(modules, moduleName);
  }

  public assertContainerInitialized(
    container: DependencyContainer | undefined
  ): asserts container is DependencyContainer {
    if (container === undefined) {
      throw errors.dependencyContainerNotSet(this.constructor.name);
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
    Object.keys(modules).forEach((moduleName) => {
      if (Object.prototype.hasOwnProperty.call(modules, moduleName)) {
        this.assertIsValidModuleName(moduleName);

        log.debug(`Registering module: ${moduleName}`);

        const useClass = modules[moduleName];

        this.container.register(
          moduleName,
          { useClass },
          { lifecycle: Lifecycle.ContainerScoped }
        );
        this.onAfterModuleResolution(moduleName);
      }
    });
  }

  public get events(): EventEmitterProxy<Modules> {
    if (this.eventEmitterProxy === undefined) {
      this.eventEmitterProxy = new EventEmitterProxy<Modules>(this);
    }
    return this.eventEmitterProxy;
  }

  /**
   * Register a non-module value into the current container
   * @param modules
   */
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
    this.config = config;
  }

  public configurePartial(config: RecursivePartial<ModulesConfig<Modules>>) {
    this.config = merge<
      ModulesConfig<Modules> | NoConfig,
      RecursivePartial<ModulesConfig<Modules>>
    >(this.currentConfig ?? {}, config);
  }

  public get config() {
    return super.config;
  }

  public set config(config: ModulesConfig<Modules>) {
    super.config = merge<
      ModulesConfig<Modules> | NoConfig,
      ModulesConfig<Modules>
    >(this.currentConfig ?? {}, config);
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
  public resolve<KeyType extends StringKeyOf<ResolvableModules<Modules>>>(
    moduleName: KeyType
  ): InstanceType<ResolvableModules<Modules>[KeyType]> {
    return this.container.resolve<
      InstanceType<ResolvableModules<Modules>[KeyType]>
    >(moduleName);
  }

  public resolveOrFail<ModuleType>(
    moduleName: string,
    moduleType: TypedClass<ModuleType>
  ) {
    const instance = this.container.resolve<ModuleType>(moduleName);
    const isValidModuleInstance = instance instanceof moduleType;

    if (!isValidModuleInstance) {
      throw errors.validModuleInstance(moduleName, moduleType.name);
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
    const config = super.config?.[moduleName];
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!config) {
      throw errors.configNotSetInContainer(moduleName.toString());
    }

    if (containedModule instanceof ModuleContainer) {
      containedModule.configure(config);
    } else {
      containedModule.config = config;
    }
  }

  private isDependencyFactory(type: any): type is DependencyFactory {
    return "dependencies" in type;
  }

  /**
   * Inject a set of dependencies using the given list of DependencyFactories
   * This method should be called during startup
   */
  protected initializeDependencyFactories(factories: StringKeyOf<Modules>[]) {
    factories.forEach((factoryName) => {
      this.resolve(factoryName);
    });
  }

  /**
   * Retrieves all dependencies generated by a particular dependencyfactory
   * and injects them inside this modulecontainer's DI container.
   * This will be automatically called for every module, but can also be called
   * explicitly to initialize an extra factory
   * @param factory
   * @private
   */
  protected useDependencyFactory(factory: DependencyFactory) {
    const dependencies = factory.dependencies();

    Object.entries(dependencies).forEach(([rawKey, declaration]) => {
      const key = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);

      if (
        !this.container.isRegistered(key) ||
        declaration.forceOverwrite === true
      ) {
        // Find correct provider type and call respective register
        if (isValueProvider(declaration)) {
          this.container.register(key, declaration);
        } else if (isFactoryProvider(declaration)) {
          // this enables us to have a singletoned factory
          // that returns the same instance for each resolve
          this.container.register(key, {
            useFactory: instancePerContainerCachingFactory(
              declaration.useFactory
            ),
          });
        } else if (isClassProvider(declaration)) {
          this.container.register(key, declaration, {
            lifecycle: Lifecycle.Singleton,
          });
          // eslint-disable-next-line sonarjs/no-duplicated-branches
        } else if (isTokenProvider(declaration)) {
          this.container.register(key, declaration, {
            lifecycle: Lifecycle.Singleton,
          });
        } else {
          // Can never be reached
          throw new Error("Above if-statement is exhaustive");
        }
      } else {
        log.debug(`Dependency ${key} already registered, skipping`);
      }
    });
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

        if (this.isDependencyFactory(containedModule)) {
          this.useDependencyFactory(containedModule);
        }
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

    this.registerValue({
      ChildContainerProvider: () => this.container.createChildContainer(),
    });

    // register all provided modules when the container is created
    this.registerModules(this.definition.modules);
  }
}
