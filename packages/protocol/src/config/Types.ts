import { ConfigurationReceiver } from "./ConfigurationReceiver";

//Removes all keys that contains only void or undefined as value-type from an object. This is great for config-function because it leaves out unnecessary required lines
export type RemoveUndefinedKeys<X> = { [key in keyof X as (X[key] extends void | undefined ? never : key)]: X[key] }

export type Components = {
  [key: string]: ConfigurationReceiver<unknown>
}

export type ComponentConfig<Comps extends Components> = {
  [key in keyof Comps]: Comps[key] extends ConfigurationReceiver<infer R> ? R : any
}


// FlipOptional is a type that removes undefined from types that accept undefined and makes non-undefined types (T | undefined).
// I.e. it "flips" the optional types
// Example:
// {
//   a: string,
//   b: string | undefined
// }
// -->
// {
//   a: string | undefined,
//   b: string
// }
type OptionalKeys2<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T];

export type FlipOptional<T> = (Required<Pick<T, OptionalKeys2<T>>> &
  Partial<Omit<T, OptionalKeys2<T>>>) extends infer O
  ? { [K in keyof O]: O[K] }
  : never;