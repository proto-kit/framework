import { injectable, Lifecycle, scoped } from "tsyringe";
import { ISequencer } from "./ISequencer";
import { GraphQLServerModule } from "../../graphql/GraphqlSequencerModule";
import {
  SequencerModulesType,
} from "../builder/Types";
import { RuntimeSequencerModule } from "../../protocol/RuntimeSequencerModule";
import {
  ModuleContainer,
  RemoveUndefinedKeys,
  ComponentConfig,
  TypedClassType,
  ConfigurationReceiver, ResolvedModulesType
} from "@yab/protocol";
import { RuntimeModules } from "@yab/module";
import { SequencerModule } from "../builder/SequencerModule";

type UnresolvedModulesType = { [key: string]: TypedClassType<SequencerModule<unknown>> }

// type ResolvedModulesType<T extends UnresolvedModulesType> =
//   { [key in keyof T]: T[key] extends TypedClassType<SequencerModule<infer R>> ? SequencerModule<R> : any }

@injectable()
@scoped(Lifecycle.ContainerScoped)
// export class Sequencer<Modules extends SequencerModulesType> extends ModuleContainer<Modules> implements ISequencer<Modules> {
export class Sequencer<UnresolvedModules extends UnresolvedModulesType>
  extends ModuleContainer<SequencerModule<unknown>, UnresolvedModules>
  // implements ISequencer<ResolvedModulesType<UnresolvedModules>>
{

  public constructor(
    // unresolvedModules: { [key in keyof Modules]: TypedClassType<Modules[key]> },
    unresolvedModules: UnresolvedModules,
  ) {
    super(unresolvedModules);
  }

  private started = false;
  private resolvedModules?: ResolvedModulesType<SequencerModule<unknown>, UnresolvedModules>;

  public async start() {

    this.resolvedModules = this.initModules()

    let config = this.getConfig()

    for (let key in this.resolvedModules) {
      let module = this.resolvedModules[key];


      await module.start();
    }

    this.started = true;
  }


  // public config2(config: ComponentConfig<Modules>): void {
    // this.config(config)
  // }

  public static from<
    UnresolvedModules extends { [key: string]: TypedClassType<SequencerModule<unknown>> },
    Modules extends { [key in keyof UnresolvedModules]: UnresolvedModules[key] extends TypedClassType<SequencerModule<infer R>> ? SequencerModule<R> : any },
  >(modules: UnresolvedModules): Sequencer<UnresolvedModules> {

    return new Sequencer<UnresolvedModules>(
      modules
    );
  }

  // static from<
  //   Modules extends SequencerModulesType,
  //   UnresolvedModules extends { [key in keyof Modules]: TypedClassType<Modules[key]> },
  // >(modules: UnresolvedModules): Sequencer<Modules> {
  //
  //   return new Sequencer<Modules>(
  //     modules
  //   );
  // }
}

type Comps2 = {
  graphql: GraphQLServerModule
}

type Conf = ComponentConfig<Comps2>

let x: Conf = {
  graphql: {
    port: 123,
    host: ""
  }
}

async function test() {

  let sequencer = Sequencer.from({
    graphql: GraphQLServerModule,
    // runtime: RuntimeSequencerModule,
  });

  sequencer.config({
    graphql: {
      port: 8080,
    },
    // runtime: {},
  });

  await sequencer.start();
}
