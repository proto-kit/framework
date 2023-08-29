import {
  log,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  StringKeyOf,
  TypedClass,
} from "@proto-kit/common";
import { DependencyContainer, Lifecycle } from "tsyringe";

import {
  BlockProvable,
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "../prover/block/BlockProvable";
import { StateTransitionProver } from "../prover/statetransition/StateTransitionProver";
import {
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../prover/statetransition/StateTransitionProvable";
import { BlockProver } from "../prover/block/BlockProver";
import { StateServiceProvider } from "../state/StateServiceProvider";
import { StateService } from "../state/StateService";

import { ProtocolModule } from "./ProtocolModule";
import type { BlockModule } from "./BlockModule";

export type GenericProtocolModuleRecord = ModulesRecord<
  TypedClass<ProtocolModule<any, any>>
>;

interface BlockProverType
  extends ProtocolModule<BlockProverPublicInput, BlockProverPublicOutput>,
    BlockProvable {}

interface StateTransitionProverType
  extends ProtocolModule<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    StateTransitionProvable {}

export interface ProtocolCustomModulesRecord {
  BlockProver: TypedClass<BlockProverType>;
  StateTransitionProver: TypedClass<StateTransitionProverType>;
}

export interface ProtocolModulesRecord
  extends GenericProtocolModuleRecord,
    ProtocolCustomModulesRecord {}

export interface ProtocolDefinition<Modules extends ProtocolModulesRecord> {
  modules: Modules;
  blockModules: TypedClass<BlockModule>[];

  /**
   * @deprecated
   */
  state?: StateService;
  // config: ModulesConfig<Modules>
}

export class Protocol<
  Modules extends ProtocolModulesRecord
> extends ModuleContainer<Modules> {
  // .from() to create Protocol
  public static from<Modules extends ProtocolModulesRecord>(
    modules: ProtocolDefinition<Modules>
  ) {
    const protocol = new Protocol(modules);

    // Set empty config for all modules, since we don't have that feature yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment
    const emptyConfig = Object.keys(modules.modules).reduce<any>(
      (agg, item: string) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        agg[item] = {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return agg;
      },
      {}
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    protocol.configure(emptyConfig as ModulesConfig<Modules>);

    return protocol;
  }

  public definition: ProtocolDefinition<Modules>;

  private readonly stateServiceProviderInstance = new StateServiceProvider(
    // eslint-disable-next-line etc/no-deprecated
    this.definition.state
  );

  public constructor(definition: ProtocolDefinition<Modules>) {
    super(definition);
    this.definition = definition;

    // Register the BlockModules seperately since we need to
    // inject them differently later
    definition.blockModules.forEach((useClass) => {
      this.container.register(
        "BlockModule",
        { useClass },
        { lifecycle: Lifecycle.ContainerScoped }
      );
    });
  }

  public get stateService(): StateService {
    return this.stateServiceProviderInstance.stateService;
  }

  public get stateServiceProvider(): StateServiceProvider {
    return this.stateServiceProviderInstance;
  }

  public decorateModule(
    moduleName: StringKeyOf<Modules>,
    containedModule: InstanceType<Modules[StringKeyOf<Modules>]>
  ) {
    log.debug(`Decorated ${moduleName}`);
    containedModule.protocol = this;

    super.decorateModule(moduleName, containedModule);
  }

  public get dependencyContainer(): DependencyContainer {
    return this.container;
  }

  private isModule(
    moduleName: keyof Modules
  ): moduleName is StringKeyOf<Modules> {
    return this.definition.modules[moduleName] !== undefined;
  }

  public get blockProver(): BlockProvable {
    // Why do I resolve directly here?
    // I don't know exactly but generics don't let me use .resolve()
    return this.container.resolve<InstanceType<Modules["BlockProver"]>>(
      "BlockProver"
    );
  }

  public get stateTransitionProver(): StateTransitionProvable {
    return this.container.resolve<
      InstanceType<Modules["StateTransitionProver"]>
    >("StateTransitionProver");
  }
}

export const VanillaProtocol = {
  create(): Protocol<{
    StateTransitionProver: typeof StateTransitionProver;
    BlockProver: typeof BlockProver;
  }> {
    return Protocol.from({
      modules: {
        StateTransitionProver,
        BlockProver,
      },

      blockModules: [],
    });
  },
};
