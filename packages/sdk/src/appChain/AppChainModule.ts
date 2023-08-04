/* eslint-disable import/no-unused-modules */
import {
  ConfigurableModule,
  ModulesRecord,
  Presets,
  TypedClass,
} from "@proto-kit/common";
import { RuntimeModulesRecord } from "@proto-kit/module";
import { ProtocolModulesRecord } from "@proto-kit/protocol";
import { SequencerModulesRecord } from "@proto-kit/sequencer";
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
