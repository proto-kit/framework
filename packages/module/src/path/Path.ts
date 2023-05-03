/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-extraneous-class */
/* eslint-disable @shopify/no-fully-static-classes */
/* eslint-disable import/prefer-default-export */
import { Field, type FlexibleProvablePure, Poseidon } from 'snarkyjs';

export class Path {
  public static toField(value: string) {
    const fields = value
      .split('')
      .map((character) => character.codePointAt(0))
      .filter((code): code is number => code !== undefined)
      .map((code) => Field(code));

    return Poseidon.hash(fields);
  }

  public static fromProperty(className: string, propertyKey: string): Field {
    return Poseidon.hash([
      Path.toField(className),
      Path.toField(propertyKey),
      Field(0),
    ]);
  }

  public static fromKey<KeyType>(
    path: Field,
    keyType: FlexibleProvablePure<KeyType>,
    key: KeyType
  ): Field {
    const keyHash = Poseidon.hash(keyType.toFields(key));
    return Poseidon.hash([path, keyHash]);
  }
}
