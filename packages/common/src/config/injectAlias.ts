import { TypedClass } from "../types";

export const injectAliasMetadataKey = "protokit-inject-alias";

/**
 * Attaches metadata to the class that the ModuleContainer can pick up
 * and inject this class in the DI container under the specified aliases.
 * This method supports inheritance, therefore also gets aliases defined
 * on superclasses
 */
export function injectAlias(aliases: string[]) {
  return (target: TypedClass<unknown>) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const superAliases = Reflect.getMetadata(
      injectAliasMetadataKey,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Object.getPrototypeOf(target)
    ) as string[] | undefined;

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const existingAliases = Reflect.getMetadata(
      injectAliasMetadataKey,
      target
    ) as string[] | undefined;

    let allAliases = aliases;

    if (superAliases !== undefined) {
      allAliases = allAliases.concat(superAliases);
    }
    if (existingAliases !== undefined) {
      allAliases = allAliases.concat(existingAliases);
    }

    Reflect.defineMetadata(
      injectAliasMetadataKey,
      allAliases.filter(
        (value, index, array) => array.indexOf(value) === index
      ),
      target
    );
  };
}

/**
 * Marks the class to implement a certain interface T, while also attaching
 * a DI-injection alias as metadata, that will be picked up by the ModuleContainer
 * to allow resolving by that interface name
 * @param name The name of the injection alias, convention is to use the same as the name of T
 */
export function implement<T>(name: string) {
  return (
    /**
     * Check if the target class extends RuntimeModule, while
     * also providing static config presets
     */
    target: TypedClass<T>
  ) => {
    injectAlias([name])(target);
  };
}

export function getInjectAliases(target: TypedClass<unknown>): string[] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const aliases = Reflect.getMetadata(
    injectAliasMetadataKey,
    target
  ) as string[];
  return aliases ?? [];
}
