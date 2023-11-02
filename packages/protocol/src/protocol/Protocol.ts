import {
  AreProofsEnabled,
  ChildContainerProvider,
  log,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  StringKeyOf,
  TypedClass,
} from "@proto-kit/common";
import { DependencyContainer, Lifecycle } from "tsyringe";

import { BlockProvable } from "../prover/block/BlockProvable";
import { StateTransitionProver } from "../prover/statetransition/StateTransitionProver";
import { StateTransitionProvable } from "../prover/statetransition/StateTransitionProvable";
import { BlockProver } from "../prover/block/BlockProver";
import { StateServiceProvider } from "../state/StateServiceProvider";
import { StateService } from "../state/StateService";

import { ProtocolModule } from "./ProtocolModule";
import { ProvableTransactionHook } from "./ProvableTransactionHook";
import { NoopTransactionHook } from "../blockmodules/NoopTransactionHook";
import { ProtocolEnvironment } from "./ProtocolEnvironment";

export type GenericProtocolModuleRecord = ModulesRecord<
  TypedClass<ProtocolModule<unknown>>
>;

interface BlockProverType extends ProtocolModule<object>, BlockProvable {}

interface StateTransitionProverType
  extends ProtocolModule<object>,
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
  config?: ModulesConfig<Modules>;
}

export class Protocol<Modules extends ProtocolModulesRecord>
  extends ModuleContainer<Modules>
  implements ProtocolEnvironment
{
  // .from() to create Protocol
  public static from<Modules extends ProtocolModulesRecord>(
    modules: ProtocolDefinition<Modules>
  ): TypedClass<Protocol<Modules>> {
    return class ScopedProtocol extends Protocol<Modules> {
      public constructor() {
        super(modules);
      }
    };
  }

  public definition: ProtocolDefinition<Modules>;

  public constructor(definition: ProtocolDefinition<Modules>) {
    super(definition);
    this.definition = definition;
  }

  public get stateService(): StateService {
    return this.stateServiceProvider.stateService;
  }

  public get stateServiceProvider(): StateServiceProvider {
    return this.container.resolve<StateServiceProvider>("StateServiceProvider");
  }

  public decorateModule(
    moduleName: StringKeyOf<Modules>,
    containedModule: InstanceType<Modules[StringKeyOf<Modules>]>
  ) {
    log.debug(`Decorated ${moduleName}`);
    containedModule.protocol = this;

    if (containedModule instanceof ProvableTransactionHook) {
      containedModule.name = moduleName;
    }

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

  public getAreProofsEnabled(): AreProofsEnabled {
    return this.container.resolve<AreProofsEnabled>("AreProofsEnabled");
  }

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);

    // Register the BlockModules seperately since we need to
    // inject them differently later
    let atLeastOneTransactionHookRegistered = false;
    Object.entries(this.definition.modules).forEach(([key, value]) => {
      if (Object.prototype.isPrototypeOf.call(ProvableTransactionHook, value)) {
        this.container.register(
          "ProvableTransactionHook",
          { useToken: key },
          { lifecycle: Lifecycle.ContainerScoped }
        );
        atLeastOneTransactionHookRegistered = true;
      }
    });

    // We need this so that tsyringe doesn't throw when no hooks are registered
    if (!atLeastOneTransactionHookRegistered) {
      this.container.register(
        "ProvableTransactionHook",
        { useClass: NoopTransactionHook },
        { lifecycle: Lifecycle.ContainerScoped }
      );
    }
  }
}

export const VanillaProtocol = {
  create() {
    return VanillaProtocol.from(
      {},
      {
        BlockProver: {},
        StateTransitionProver: {},
      }
    );
  },

  from<AdditonalModules extends GenericProtocolModuleRecord>(
    additionalModules: AdditonalModules,
    config: ModulesConfig<
      AdditonalModules & {
        StateTransitionProver: typeof StateTransitionProver;
        BlockProver: typeof BlockProver;
      }
    >
  ): TypedClass<
    Protocol<
      AdditonalModules & {
        StateTransitionProver: typeof StateTransitionProver;
        BlockProver: typeof BlockProver;
      }
    >
  > {
    return Protocol.from({
      modules: {
        StateTransitionProver,
        BlockProver,
        ...additionalModules,
      },

      config,
    });
  },
};