import { ComponentConfig, Components, RemoveUndefinedKeys } from "./Types";

//In this context, a "Component" is just a way of generalizing Modules, bc they don't have to be modules, they can be any configurable unit
export interface ConfigurationAggregator<Comps extends Components> {

  config(config: RemoveUndefinedKeys<ComponentConfig<Comps>>): void;

}