import {
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  StringKeyOf,
  TypedClass,
} from "@yab/common";
import { DependencyContainer } from "tsyringe";

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

import { ProtocolModule } from "./ProtocolModule";

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

  protected decorateModule(
    moduleName: StringKeyOf<Modules>,
    containedModule: InstanceType<Modules[StringKeyOf<Modules>]>
  ) {
    console.log("Decorated " + moduleName);
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
    });
  },
};
