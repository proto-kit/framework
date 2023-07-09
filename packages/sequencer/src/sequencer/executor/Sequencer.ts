/* eslint-disable guard-for-in */
import {
  ModuleContainer,
  ModulesRecord,
  TypedClass,
  ModuleContainerDefinition,
} from "@yab/common";
import { Runtime, RuntimeModulesRecord } from "@yab/module";
import { injectable } from "tsyringe";

import { SequencerModule } from "../builder/SequencerModule";

import { Sequenceable } from "./Sequenceable";
import { Protocol, ProtocolModulesRecord } from "@yab/protocol/src/protocol/Protocol";
import {
  StateTransitionWitnessProvider,
  StateTransitionWitnessProviderReference
} from "@yab/protocol";

export type SequencerModulesRecord = ModulesRecord<
  TypedClass<SequencerModule<unknown>>
>;

@injectable()
export class Sequencer<Modules extends SequencerModulesRecord>
  extends ModuleContainer<Modules>
  implements Sequenceable
{
  /**
   * Alternative constructor for Sequencer
   * @param definition
   * @returns Sequencer
   */
  public static from<Modules extends SequencerModulesRecord>(
    definition: ModuleContainerDefinition<Modules>
  ) {
    return new Sequencer(definition);
  }

  public get runtime(): Runtime<RuntimeModulesRecord> {
    return this.container.resolve<Runtime<RuntimeModulesRecord>>("Runtime");
  }

  public get protocol(): Protocol<ProtocolModulesRecord> {
    return this.container.resolve<Protocol<ProtocolModulesRecord>>("Protocol");
  }

  /**
   * Starts the sequencer by iterating over all provided
   * modules to start each
   */
  public async start() {
    // Set default STWitnessProvider inside protocol
    const witnessProviderReference = this.protocol.dependencyContainer.resolve(StateTransitionWitnessProviderReference);
    const witnessProvider = this.container.resolve<StateTransitionWitnessProvider>("StateTransitionWitnessProvider");
    witnessProviderReference.setWitnessProvider(witnessProvider);

    console.log("starting sequencer 2", this.definition.modules);
    for (const moduleName in this.definition.modules) {
      console.log("starting sequecncer module", moduleName);
      const sequencerModule = this.resolve(moduleName);

      // eslint-disable-next-line no-await-in-loop
      await sequencerModule.start();
    }
  }
}
