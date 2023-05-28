import { ConfigurationAggregator, RemoveUndefinedKeys } from "@yab/protocol";
import { SequencerModulesType } from "../builder/Types";
import { DependencyContainer } from "tsyringe";

export interface ISequencer<Modules extends SequencerModulesType> extends ConfigurationAggregator<Modules>{

  start(): Promise<void>

}