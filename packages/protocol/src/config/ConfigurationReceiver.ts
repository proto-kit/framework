import { FlipOptional } from "./Types";

export interface ConfigurationReceiver<Config> {

  get config() : Required<Config>

  set config(config: Config)

  get defaultConfig() : FlipOptional<Config>;

}