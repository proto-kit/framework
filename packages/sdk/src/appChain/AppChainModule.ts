/* eslint-disable import/no-unused-modules */
import {
  ConfigurableModule,
  ModulesRecord,
  Presets,
  TypedClass,
} from "@yab/common";
import { RuntimeModulesRecord } from "@yab/module";
import { ProtocolModulesRecord } from "@yab/protocol/src/protocol/Protocol";
import { SequencerModulesRecord } from "@yab/sequencer";
import { injectable } from "tsyringe";
import { AppChain, AppChainModulesRecord } from "./AppChain";

@injectable()
export class AppChainModule<Config> extends ConfigurableModule<Config> {
  public static presets: Presets<unknown> = {};

  public appChain?: AppChain<
    RuntimeModulesRecord,
    ProtocolModulesRecord,
    SequencerModulesRecord,
    AppChainModulesRecord
  >;
}
