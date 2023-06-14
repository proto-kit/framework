// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/ban-types,@typescript-eslint/no-explicit-any */
import { ConfigurationReceiver } from "./ConfigurationReceiver";

// Removes all keys that contains only void or undefined as value-type from an object.
// This is great for config-function because it leaves out unnecessary required lines
export type RemoveUndefinedKeys<Target> = {
  [key in keyof Target as Target[key] extends undefined
    ? never
    : key]: Target[key];
};

export type Components = {
  [key: string]: ConfigurationReceiver<unknown>;
};

export type ComponentConfig<Comps extends Components> = {
  [key in keyof Comps]: Comps[key] extends ConfigurationReceiver<infer R>
    ? R
    : any;
};

export type UninitializedComponentConfig<Config extends ComponentConfig<any>> =
  {
    [key in keyof Config]: Config[key] | undefined;
  };

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
type OptionalKeys2<Target> = {
  [Key in keyof Target]-?: {} extends Pick<Target, Key> ? Key : never;
}[keyof Target];

export type FlipOptional<Target> = Required<
  Pick<Target, OptionalKeys2<Target>>
> &
  Partial<Omit<Target, OptionalKeys2<Target>>> extends infer Output
  ? { [Key in keyof Output]: Output[Key] }
  : never;
