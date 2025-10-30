import {
  AreProofsEnabled,
  log,
  ModuleContainer,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";
import { Protocol } from "@proto-kit/protocol";
import { Runtime } from "@proto-kit/module";
import { container, DependencyContainer } from "tsyringe";

import { Sequencer } from "../sequencer/executor/Sequencer";
import { WorkerReadyModule } from "../worker/worker/WorkerReadyModule";
import { ConsoleTracingFactory } from "../logging/ConsoleTracingFactory";

import { AreProofsEnabledFactory } from "./AreProofsEnabledFactory";
import { SharedDependencyFactory } from "./SharedDependencyFactory";
import type { AppChainModule } from "./AppChainModule";

export type AppChainModulesRecord = ModulesRecord<
  TypedClass<AppChainModule<unknown>>
>;

export type MinimalAppChainDefinition = AppChainModulesRecord & {
  Runtime: TypedClass<AppChainModule<unknown> & Runtime<any>>;
  Protocol: TypedClass<AppChainModule<unknown> & Protocol<any>>;
  Sequencer: TypedClass<AppChainModule<unknown> & Sequencer<any>>;
};

/**
 * AppChain acts as a wrapper connecting Runtime, Protocol and Sequencer
 */
export class AppChain<
  Modules extends MinimalAppChainDefinition,
> extends ModuleContainer<Modules> {
  // alternative AppChain constructor
  public static from<Modules extends MinimalAppChainDefinition>(
    definition: Modules
  ) {
    return new AppChain(definition);
  }

  public constructor(definition: Modules) {
    super(definition);
  }

  public get runtime(): InstanceType<Modules["Runtime"]> {
    return this.resolveOrFail("Runtime");
  }

  public get sequencer(): InstanceType<Modules["Sequencer"]> {
    return this.resolveOrFail("Sequencer");
  }

  public get protocol(): InstanceType<Modules["Protocol"]> {
    return this.resolveOrFail("Protocol");
  }

  /**
   * Starts the appchain and cross-registers runtime to sequencer
   */
  public async start(
    proofsEnabled: boolean = false,
    dependencyContainer: DependencyContainer = container
  ) {
    this.create(() => dependencyContainer);

    this.useDependencyFactory(AreProofsEnabledFactory);
    this.useDependencyFactory(SharedDependencyFactory);
    this.useDependencyFactory(ConsoleTracingFactory);

    this.container
      .resolve<AreProofsEnabled>("AreProofsEnabled")
      .setProofsEnabled(proofsEnabled);

    // These three statements are crucial for dependencies inside any of these
    // components to access their siblings inside their constructor.
    // This is because when it is the first time they are resolved, create()
    // will not be called until after the constructor finished because of
    // how tsyringe handles hooks
    this.resolveOrFail("Runtime");
    this.resolveOrFail("Protocol");
    this.resolveOrFail("Sequencer");

    // // Workaround to get protocol and sequencer to have
    // // access to the same WitnessProviderReference
    // const reference = new StateTransitionWitnessProviderReference();
    // this.registerValue({
    //   StateTransitionWitnessProviderReference: reference,
    // });

    // console.log("creating sequencer");
    // this.sequencer.create(() => this.container);

    await this.protocol.start();

    // this.runtime.start();
    await this.sequencer.start();

    // Wait for readiness for worker-ish configurations
    await this.sequencer.dependencyContainer
      .resolve(WorkerReadyModule)
      .waitForReady();

    log.info("Started!");
  }

  public async close() {
    await this.sequencer.close();
  }
}
