import type { Sequencer } from "../executor/Sequencer.js";
import type { SequencerBuilder } from "./SequencerBuilder.js";

/**
 * Lifecycle of a SequencerModule
 *
 * bind(): Executed after creating the module and allowing the module inject additional dependencies / configuration
 *
 * start(): Executed to execute any logic required to start the module
 */
export abstract class SequencerModule {

  public abstract start(runtime: Sequencer): Promise<void>
  public abstract bind(builder: SequencerBuilder) : void
  public abstract get name() : string

}