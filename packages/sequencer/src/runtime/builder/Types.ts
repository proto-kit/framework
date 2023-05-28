import { SequencerModule } from "./SequencerModule";
import { TypedClassType } from "@yab/protocol";

// export type UnionToIntersection<U> =
//   (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never
type UnionToIntersection<T> =
  (T extends any ? (x: T) => any : never) extends
    (x: infer R) => any ? R : never

// export type BuilderModulesType = { [key: string]: SequencerModule<unknown> | TypedClassType<SequencerModule<unknown>> }
// export type BuilderModulesType<ResolvedType extends SequencerModulesType> = { [key in keyof ResolvedType]: TypedClassType<ResolvedType[key]> } //ResolvedType[key] |

// Types for building the GeneralSequencer
export type BuilderModulesType = { [key: string]: TypedClassType<SequencerModule<unknown>> }
export type BuilderResolvedModulesType<BuilderModules> = { [key in keyof BuilderModules]: BuilderModules[key] extends TypedClassType<infer Seq> ? (Seq extends SequencerModule<unknown> ? Seq : any) : any }


export type SequencerModulesType = { [key: string]: SequencerModule<unknown> }
// export type BuilderConfigType<T extends SequencerModulesType> = UnionToIntersection<{ [key in keyof T]: T[key] extends SequencerModule<infer R> ? R : any }>
export type BuilderConfigType<T extends SequencerModulesType> = { [key in keyof T]: T[key] extends SequencerModule<infer R> ? R : any }