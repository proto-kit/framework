/* eslint-disable guard-for-in */
import {
  ModuleContainer,
  ModulesRecord,
  TypedClass,
  ModuleContainerDefinition,
  log, ChildContainerProvider
} from "@proto-kit/common";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { Protocol, ProtocolModulesRecord } from "@proto-kit/protocol";
import { DependencyContainer, injectable } from "tsyringe";

import { SequencerModule } from "../builder/SequencerModule";

import { Sequenceable } from "./Sequenceable";
import { MethodIdFactory } from "@proto-kit/module/dist/factories/MethodIdFactory";

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
  ): TypedClass<Sequencer<Modules>> {
    return class ScopedSequencer extends Sequencer<Modules> {
      public constructor() {
        super(definition);
      }
    };
  }

  public get runtime(): Runtime<RuntimeModulesRecord> {
    return this.container.resolve<Runtime<RuntimeModulesRecord>>("Runtime");
  }

  public get protocol(): Protocol<ProtocolModulesRecord> {
    return this.container.resolve<Protocol<ProtocolModulesRecord>>("Protocol");
  }

  public get dependencyContainer(): DependencyContainer {
    return this.container;
  }

  /**
   * Starts the sequencer by iterating over all provided
   * modules to start each
   */
  public async start() {
    // Set default STWitnessProvider inside protocol
    // eslint-disable-next-line no-warning-comments,max-len
    // TODO But what is the default? How do we deal with stages states (i.e. simulated state) in the DI container?
    // const witnessProviderReference = this.protocol.dependencyContainer
    // .resolve(
    //   StateTransitionWitnessProviderReference
    // );
    // const witnessProvider =
    //   this.container.resolve<StateTransitionWitnessProvider>(
    //     "StateTransitionWitnessProvider"
    //   );
    // witnessProviderReference.setWitnessProvider(witnessProvider);

    this.registerDependencyFactories([MethodIdFactory]);

    // Log startup info
    const moduleClassNames = Object.values(this.definition.modules).map(
      (clazz) => clazz.name
    );
    log.info("Starting sequencer...");
    log.info("Modules:", moduleClassNames);

    for (const moduleName in this.definition.modules) {
      const sequencerModule = this.resolve(moduleName);

      log.info(
        `Starting sequencer module ${moduleName} (${sequencerModule.constructor.name})`
      );
      // eslint-disable-next-line no-await-in-loop
      await sequencerModule.start();
    }
  }
}
