import { ConfigurationAggregator } from "@yab/protocol";
import { SequencerModulesType } from "../builder/Types";

export interface Sequenceable<Modules extends SequencerModulesType> extends ConfigurationAggregator<Modules>{

  start(): Promise<void>

}