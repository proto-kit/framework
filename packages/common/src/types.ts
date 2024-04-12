// allows to reference interfaces as 'classes' rather than instances
import { Bool, Field, PublicKey } from "o1js";

export type TypedClass<Class> = new (...args: any[]) => Class;

export type UnTypedClass = new (...args: any[]) => unknown;

/**
 * Using simple `keyof Target` would result into the key
 * being `string | number | symbol`, but we want just a `string`
 */
export type StringKeyOf<Target extends object> = Extract<keyof Target, string> &
  string;

/**
 * Utility type to infer element type from an array type
 */
export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

/**
 * Transforms X | Y => X & Y
 */
export type UnionToIntersection<Union> = (
  Union extends any ? (x: Union) => void : never
) extends (x: infer Intersection) => void
  ? Intersection
  : never;

export type MergeObjects<Input extends Record<string, unknown>> =
  UnionToIntersection<Input[keyof Input]>;

export type OmitKeys<Record, Keys> = {
  [Key in keyof Record as Key extends Keys ? never : Key]: Record[Key];
};

// Because Publickey.empty() is not usable in combination with real
// cryptographic  operations because it's group evaluation isn't defined in Fp,
// we use some other arbitrary point which we treat as "empty" in our circuits
// other arbitrary point
export const EMPTY_PUBLICKEY_X = Field(4600);
export const EMPTY_PUBLICKEY = PublicKey.fromObject({
  x: EMPTY_PUBLICKEY_X,
  isOdd: Bool(true),
});

export type OverwriteObjectType<Base, New> = {
  [Key in keyof Base]: Key extends keyof New ? New[Key] : Base[Key];
} & New;
