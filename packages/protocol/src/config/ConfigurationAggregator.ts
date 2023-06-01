/* eslint-disable @typescript-eslint/no-explicit-any,guard-for-in,@typescript-eslint/no-unsafe-member-access,max-len,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/consistent-type-assertions */
import {
  ComponentConfig,
  Components,
  RemoveUndefinedKeys,
  UninitializedComponentConfig,
} from "./Types";

/**
 * In this context, a "Component" is just a way of generalizing Modules,
 * because they don't have to be modules, they can be any configurable unit
 */
export abstract class ConfigurationAggregator<Comps extends Components> {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  protected applyConfig(
    modules: Comps,
    currentConfig: UninitializedComponentConfig<ComponentConfig<Comps>>,
    config: RemoveUndefinedKeys<ComponentConfig<Comps>>
  ): ComponentConfig<Comps> {
    const nextConfig: any = {};

    for (const key in config) {
      // Set config to module
      if (currentConfig[key] === undefined) {
        // Initialize config with merge between config and defaultConfig
        // eslint-disable-next-line prefer-destructuring,putout/putout
        const defaultConfig: any = modules[key].defaultConfig;

        const newConfig = config[key];
        for (const configKey in newConfig) {
          defaultConfig[configKey] = newConfig[configKey];
        }
        // The result of that is always a valid Required<Config> since FlipOptional<Config> requires the exact opposite of Config

        modules[key].config = defaultConfig;
        nextConfig[key] = defaultConfig;
      } else {
        // Append/overwrite to existing config
        const newConfig: any = config[key];
        const moduleConfig: any = currentConfig[key];

        for (const configKey in moduleConfig) {
          if (newConfig[configKey] !== undefined) {
            moduleConfig[configKey] = newConfig[configKey];
          }
        }
        modules[key].config = moduleConfig;
        nextConfig[key] = moduleConfig;
      }
    }
    return nextConfig as ComponentConfig<Comps>;
  }

  public abstract config(config: RemoveUndefinedKeys<ComponentConfig<Comps>>): void;
}
