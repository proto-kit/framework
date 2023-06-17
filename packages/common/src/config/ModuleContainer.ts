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

export type BaseModuleType = TypedClassConstructor<Configurable<unknown>>;
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

  public get moduleNames() {
    return Object.keys(this.definition.modules);
  }

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
