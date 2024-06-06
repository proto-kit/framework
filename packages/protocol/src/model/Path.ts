import { Field, type FlexibleProvablePure, Poseidon } from "o1js";

import { stringToField } from "../utils/utils";

/**
 * Helps manage path (key) identifiers for key-values in trees.
 */
export class Path {
  /**
   * Encodes a JS string as a Field
   *
   * @param value
   * @returns Field representation of the provided value
   */
  public static toField(value: string) {
    return stringToField(value);
  }

  /**
   * Encodes a class name and its property name into a Field
   *
   * @param className
   * @param propertyKey
   * @returns Field representation of class name + property name
   */
  public static fromProperty(className: string, propertyKey: string): Field {
    return Poseidon.hash([
      Path.toField(className),
      Path.toField(propertyKey),
      Field(0),
    ]);
  }

  /**
   * Encodes an existing path with the provided key into a single Field.
   *
   * @param path
   * @param keyType
   * @param key
   * @returns Field representation of the leading path + the provided key.
   */
  public static fromKey<KeyType>(
    path: Field,
    keyType: FlexibleProvablePure<KeyType>,
    key: KeyType
  ): Field {
    const keyHash = Poseidon.hash(keyType.toFields(key));
    return Poseidon.hash([path, keyHash]);
  }
}
