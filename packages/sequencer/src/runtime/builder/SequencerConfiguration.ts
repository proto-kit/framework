import { TypedClassType } from "../../Utils.js";
import { Mempool } from "../../mempool/Mempool.js";
import { SequencerModule } from "./SequencerModule.js";

export type BasicRuntimeConfiguration = {

  graphql: {
    port: number,
    bind: string
  },
  database: {
    type: string
  },
  l1: {
    graphql: string
  },

}

export type ModuleDescription = { location: string, name: string, token: string | undefined }

export type DescriptiveSequencerConfiguration = BasicRuntimeConfiguration & {

  mempool: ModuleDescription,
  modules: ModuleDescription[]

}

export type TypedSequencerConfiguration = BasicRuntimeConfiguration & {

  mempool: TypedClassType<Mempool>
  modules: TypedClassType<SequencerModule>[]

}

export type ResolvedSequencerConfiguration = BasicRuntimeConfiguration & {

  mempool: Mempool,
  modules: SequencerModule[]

}

type UnionToIntersection<U> =
  (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never

type ModuleDef<Config> = { [key: string]: Module<Config> }

class Builder<
  T extends { [key: string]: Module<never> },
  C extends UnionToIntersection<{ [key in keyof T]: T[key] extends Module<infer R> ? R : any }>
>{

  constructor(a: T) {
  }

  c: C

  pushConfig(c: C){
    this.c = c
  }

  getConfig<T extends keyof C>(key: T) : C[T] {
    return this.c[key]
  }

}

type Config1 = {
  a: string
}

type Config2 = {
  b: number
}

class Module<Config> {
  constructor(c: Config) {
  }
}

let arr = {
  "one": new Module<Config1>({ "a": "as" }),
  "two": new Module<Config2>({ "b": 123 })
}

let b = new Builder(arr)
b.pushConfig({
  "two": {
    b: 123,
  },
  "one": {
    a: "123"
  }
})

let strongyTyped = b.getConfig("one")

/*

class Runtime2<T> {

  public consumeConfig(config: T){

  }

}

// let arr: [Runtime2<Config1>, Runtime2<Config2>]
let obj: {
  "one": Runtime2<Config1>,
  "two": Runtime2<Config2>
}

// type X = typeof arr[number]
type ConfigKeys = keyof typeof obj

type Config<
  T extends { [key in ConfigKeys]: T[key] extends Runtime2<infer R> ? R : any }
> = {
  [key in ConfigKeys]: T[key]
}

// T extends { [key in string]: T[key] },

function injectConfigs<
  C extends { [key in string]: C[key] extends Runtime2<infer R> ? R : any }
>
(
  key: keyof C,
  module: Runtime2<C[keyof C]>,
  config: C
)
: C
{

  let keys = Object.keys(modules) as (keyof typeof modules)[]

  for(let key in keys){
    let m = module
    let c = config[key]
    m.consumeConfig(c)
  }

  return config
}

let modules = {
  "one": new Runtime2<Config1>(),
  "two": new Runtime2<Config2>()
}
let readConfig = {
  "one": { a: "" } as Config1,
  "two": { b: 1 } as Config2
}

injectConfigs(
  "one",
  modules["one"],
  readConfig
)

// let x = C["one"]
// type R = typeof x
*/