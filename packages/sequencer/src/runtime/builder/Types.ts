/* eslint-disable @typescript-eslint/no-explicit-any */
import { TypedClassType } from "@yab/protocol";

import { SequencerModule } from "./SequencerModule";

// Types for building the GeneralSequencer
export interface BuilderModulesType {
  [key: string]: TypedClassType<SequencerModule<unknown>>;
}
export type BuilderResolvedModulesType<BuilderModules> = {
  [key in keyof BuilderModules]: BuilderModules[key] extends TypedClassType<infer Seq>
    ? Seq extends SequencerModule<unknown>
      ? Seq
      : any
    : any;
};

export interface SequencerModulesType {
  [key: string]: SequencerModule<unknown>;
}