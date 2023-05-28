import { ConfigurationReceiver } from "./ConfigurationReceiver";
import { ConfigurationAggregator } from "./ConfigurationAggregator";
import { ComponentConfig, RemoveUndefinedKeys } from "./Types";
import { TypedClassType } from "../utils/Utils";
import { container as globalContainer, DependencyContainer, Lifecycle } from "tsyringe";

export type ModulesConfigType<ModuleType extends ConfigurationReceiver<unknown>> = { [key: string]: TypedClassType<ModuleType> }

export type ResolvedModulesType<ModuleType extends ConfigurationReceiver<unknown>, T extends ModulesConfigType<ModuleType>> =
  { [key in keyof T]: T[key] extends TypedClassType<infer R> ? (R extends ConfigurationReceiver<unknown> ? R : any) : any }

/**
 * ModuleContainer is base-class for all classes that implement some modules-based resolution and configuration mechanism
 *
 * Type Parameters:
 * ModuleType: The class that implements ConfigurationReceiver (i.e. the abstract Module Type)
 * UnresovledModules: The type that holds all module class types as key-value pairs
 */
export abstract class ModuleContainer<
  ModuleType extends ConfigurationReceiver<unknown>,
  UnresolvedModules extends ModulesConfigType<ModuleType>
>
  implements ConfigurationAggregator<ResolvedModulesType<ModuleType, UnresolvedModules>>
{

  private dependencyContainer = globalContainer.createChildContainer()

  private currentConfig: Partial<ComponentConfig<ResolvedModulesType<ModuleType, UnresolvedModules>>> = {}

  protected constructor(private readonly unresolvedModules: UnresolvedModules) {
    for (let key in unresolvedModules) {
      let moduleClass = unresolvedModules[key];

      this.dependencyContainer.register(key, { useClass: moduleClass }, { lifecycle: Lifecycle.ContainerScoped });
    }
  }

  private finishedConfig?: ComponentConfig<ResolvedModulesType<ModuleType, UnresolvedModules>>

  protected initModules() : ResolvedModulesType<ModuleType, UnresolvedModules> {

    let modules: { [key: string]: ConfigurationReceiver<any> } = {};
    let defaultConfig: { [key: string]: any } = {}

    for (let key in this.unresolvedModules) {
      let module = this.dependencyContainer.resolve<ConfigurationReceiver<any>>(key);
      modules[key] = module;
      defaultConfig[key] = module.defaultConfig
    }

    let config: ComponentConfig<ResolvedModulesType<ModuleType, UnresolvedModules>> = defaultConfig as ComponentConfig<ResolvedModulesType<ModuleType, UnresolvedModules>>

    let resolvedModules = modules as ResolvedModulesType<ModuleType, UnresolvedModules>

    for(let key in this.currentConfig){
      //TODO Better merge strategy
      let keyConfig = this.currentConfig[key]
      if(keyConfig !== undefined){
        config[key] = this.currentConfig[key]!
      }
      resolvedModules[key].config = config[key]
    }

    this.finishedConfig = config

    return resolvedModules

  }

  public getConfig(): ComponentConfig<ResolvedModulesType<ModuleType, UnresolvedModules>> {
    if(this.finishedConfig === undefined){
      throw new Error("Can't retrieve config before .initModules() was called")
    }
    return this.finishedConfig
  }

  public config(config: RemoveUndefinedKeys<ComponentConfig<ResolvedModulesType<ModuleType, UnresolvedModules>>>): void {
    for (const key in config) {
      this.currentConfig[key] = config[key];
    }
  }

  get container(): DependencyContainer {
    return this.dependencyContainer;
  }
}