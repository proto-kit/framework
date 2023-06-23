// allows to reference interfaces as 'classes' rather than instances
export type TypedClass<Class> = new (...args: any[]) => Class;

/**
 * Using simple `keyof Target` would result into the key
 * being `string | number | symbol`, but we want just a `string`
 */
export type StringKeyOf<Target extends object> = Extract<keyof Target, string> &
  string;
// export type StringKeyOf<Target extends object> = keyof Target
