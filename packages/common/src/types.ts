// allows to reference interfaces as 'classes' rather than instances
export type TypedClass<Class> = new (...args: any[]) => Class;

export type UnTypedClass = new (...args: any[]) => any;

/**
 * Using simple `keyof Target` would result into the key
 * being `string | number | symbol`, but we want just a `string`
 */
export type StringKeyOf<Target extends object> = Extract<keyof Target, string> &
  string;
// export type StringKeyOf<Target extends object> = keyof Target

/**
 * Utility type to infer element type from an array type
 */
export type ArrayElement<ArrayType extends readonly unknown[]> =
  // eslint-disable-next-line putout/putout
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
