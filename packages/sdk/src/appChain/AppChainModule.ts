import { ConfigurableModule, NoConfig, Presets } from "@proto-kit/common";
import { RuntimeModulesRecord } from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import { SequencerModulesRecord } from "@proto-kit/sequencer";
import { injectable } from "tsyringe";

import type { AppChain, AppChainModulesRecord } from "./AppChain";

@injectable()
export class AppChainModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {
  public static presets: Presets<unknown> = {};

  public appChain?: AppChain<
    RuntimeModulesRecord,
    MandatoryProtocolModulesRecord & ProtocolModulesRecord,
    SequencerModulesRecord,
    AppChainModulesRecord
  >;
}
