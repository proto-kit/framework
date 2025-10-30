import { ConfigurableModule, NoConfig, Presets } from "@proto-kit/common";
import { injectable } from "tsyringe";

import type { AppChain } from "./AppChain";

@injectable()
export class AppChainModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {
  public static presets: Presets<unknown> = {};

  public appChain?: AppChain<any>;
}
