import { ModuleContainer, ModulesConfig, StringKeyOf, TypedClass } from "@yab/common";
import {
  BlockProvable,
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "../prover/block/BlockProvable";
import { StateTransitionProver } from "../prover/statetransition/StateTransitionProver";
import { ProtocolModule } from "./ProtocolModule";
import {
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../prover/statetransition/StateTransitionProvable";
import { BlockProver } from "../prover/block/BlockProver";
import { DependencyContainer } from "tsyringe";

export type ProtocolModulesRecord = {
  BlockProver: TypedClass<
    BlockProvable &
      ProtocolModule<BlockProverPublicInput, BlockProverPublicOutput>
  >;
  StateTransitionProver: TypedClass<
    StateTransitionProvable &
      ProtocolModule<
        StateTransitionProverPublicInput,
        StateTransitionProverPublicOutput
      >
  >;
};

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
    const emptyConfig = Object.keys(modules.modules).reduce<any>((agg, item: string) => {
      agg[item] = {}
      return agg;
    }, {});
    protocol.configure(emptyConfig as ModulesConfig<Modules>);

    return protocol;
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

export class VanillaProtocol {
  public static create(): Protocol<{
    StateTransitionProver: typeof StateTransitionProver;
    BlockProver: typeof BlockProver;
  }> {
    return Protocol.from({
      modules: {
        StateTransitionProver: StateTransitionProver,
        BlockProver: BlockProver,
      },
    });
  }
}

const protocol = VanillaProtocol.create();
protocol.resolve("BlockProver");
