import {
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

export type GenericProtocolModuleRecord = ModulesRecord<
  TypedClass<ProtocolModule>
>;

interface BlockProverType extends ProtocolModule, BlockProvable {}

interface StateTransitionProverType
  extends ProtocolModule,
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
    let atLeastOneTransactionHookRegistered = false;
    Object.entries(definition.modules).forEach(([key, value]) => {
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
    // this.container.afterResolution<ProvableTransactionHook>("ProvableTransactionHook", (token, result) => {
    //   if ()
    // })
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

    log.debug(
      "Is instanceof:",
      containedModule instanceof ProvableTransactionHook
    );
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
}

export const VanillaProtocol = {
  create(stateService?: StateService) {
    return VanillaProtocol.from({}, stateService);
  },

  from<AdditonalModules extends GenericProtocolModuleRecord>(
    additionalModules: AdditonalModules,
    stateService?: StateService
  ): Protocol<
    AdditonalModules & {
      StateTransitionProver: typeof StateTransitionProver;
      BlockProver: typeof BlockProver;
    }
  > {
    return Protocol.from({
      modules: {
        StateTransitionProver,
        BlockProver,
        ...additionalModules,
      },
      state: stateService,
    });
  },
};
