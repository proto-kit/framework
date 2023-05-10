import type { Mempool } from "../../mempool/Mempool.js";
import { container, DependencyContainer } from "tsyringe";
import type { GraphqlModule } from "../../graphql/GraphqlModule.js";
import { Sequencer } from "../executor/Sequencer.js";
import {
  BasicRuntimeConfiguration,
  ResolvedSequencerConfiguration, TypedSequencerConfiguration
} from "./SequencerConfiguration.js";
import { SequencerModule } from "./SequencerModule.js";

export const Appchain = SequencerModule

// class AppChainModule implements SequencerModule {
//
//   public bind(builder: RuntimeBuilder): void {
//   }
//
//   public readonly name = "AppChainModule";
//
//   public start(_: RollupRuntime): void {
//   }
//
// }

export class BasicSequencerConfigurationHolder {

  public config: BasicRuntimeConfiguration

  public modules: SequencerModule[]

  public mempool: Mempool

  public constructor(config: ResolvedSequencerConfiguration) {
    this.config = {
      ...config
    }

    this.mempool = config.mempool
    this.modules = config.modules
  }
}


export class SequencerBuilder {

  private readonly config: BasicSequencerConfigurationHolder

  // --- For usage in SequencerModule

  public addModule(module: SequencerModule){
    this.runtimeContainer.register(module.name, { useValue: module })
    module.bind(this)
  }

  public getConfig() : BasicSequencerConfigurationHolder {
    return this.config
  }

  public getContainer() : DependencyContainer {
    return this.runtimeContainer
  }


  // eslint-disable-next-line etc/no-misused-generics
  // private static async injectModule<T>(runtimeContainer: DependencyContainer, { location, name, token }: ModuleDescription) : Promise<T> {
  //
  //   // eslint-disable-next-line import/no-dynamic-require,@typescript-eslint/no-unsafe-assignment
  //   const t = await import(location)
  //
  //   // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-member-access
  //   const module = t[name] as TypedClassType<T> | undefined
  //
  //   if (module !== undefined) {
  //     throw new Error(`Couldn't find module under ${location}.${name}`)
  //   } else {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  //     const instance = runtimeContainer.resolve<T>(t)
  //
  //     if(token !== undefined){
  //       runtimeContainer.register<T>(token, { useValue: instance })
  //     }
  //     return instance
  //   }
  //
  // }

  // public static async fromDescriptiveConfig(config: DescriptiveSequencerConfiguration) {
  //
  //   const runtimeContainer = container.createChildContainer()
  //   let mempool = await this.injectModule<Mempool>(runtimeContainer, config.mempool)
  //   let modules: SequencerModule[] = []
  //
  //   for(let moduleDescription of config.modules){
  //     modules.push(
  //       await SequencerBuilder.injectModule<SequencerModule>(runtimeContainer, moduleDescription)
  //     )
  //   }
  //
  //   let resolved: ResolvedSequencerConfiguration = {
  //     ...config,
  //     modules,
  //     mempool
  //   }
  //   return new SequencerBuilder(runtimeContainer, resolved)
  //
  // }

  public static fromTypedConfig(config: TypedSequencerConfiguration) : SequencerBuilder{

    const runtimeContainer = container.createChildContainer()
    const mempool = runtimeContainer.resolve(config.mempool)

    let modules: SequencerModule[] = config.modules.map(module =>
      runtimeContainer.resolve<SequencerModule>(module)
    )

    let resolved: ResolvedSequencerConfiguration = {
      ...config,
      mempool,
      modules
    }
    return new SequencerBuilder(runtimeContainer, resolved)

  }

  private registerConfigs(){

    // register configs
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-explicit-any
    let obj = this.config.config as any // TODO Add Type system for that

    // eslint-disable-next-line guard-for-in
    for(let key in obj){
      const token = `config_${ key }`
      if(!this.runtimeContainer.isRegistered(token)){
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
        this.runtimeContainer.register(token, obj[key])
      }
    }

  }

  private constructor(
    private readonly runtimeContainer: DependencyContainer,
    config: ResolvedSequencerConfiguration
  ) {

    this.config = new BasicSequencerConfigurationHolder(config)
    this.runtimeContainer.register<BasicSequencerConfigurationHolder>("config", { useValue: this.config })
    this.registerConfigs()

    this.setMempool(config.mempool)

    config.modules.forEach(module => {
      module.bind(this)
    })

  }

  private setMempool(mempool: Mempool) {
    if(this.runtimeContainer.isRegistered("mempool")) {
      throw new Error("Only one mempool module can be registered")
    }
    this.runtimeContainer.registerInstance("mempool", mempool);

  }

  public async build() : Promise<Sequencer> {

    this.runtimeContainer.register("container", { useValue: this.runtimeContainer })

    return this.runtimeContainer.resolve(Sequencer)

  }
}