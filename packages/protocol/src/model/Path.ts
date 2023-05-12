/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-extraneous-class */
/* eslint-disable @shopify/no-fully-static-classes */
/* eslint-disable import/prefer-default-export */
import { Field, type FlexibleProvablePure, Poseidon } from 'snarkyjs';

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
    const fields = value
      .split('')
      .map((character) => character.codePointAt(0))
      .filter((code): code is number => code !== undefined)
      .map((code) => Field(code));

    return Poseidon.hash(fields);
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
