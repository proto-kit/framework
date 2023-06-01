import { ConfigurationAggregator } from "@yab/protocol";
import { SequencerModulesType } from "../builder/Types";

export interface ISequencer<Modules extends SequencerModulesType> extends ConfigurationAggregator<Modules>{

  start(): Promise<void>

}