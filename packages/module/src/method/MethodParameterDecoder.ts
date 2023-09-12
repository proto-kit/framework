/* eslint-disable no-underscore-dangle */
import { Field } from "snarkyjs";

import { RuntimeModule } from "../runtime/RuntimeModule";

export interface Fieldable {
  toFields: () => Field[];
}

export interface FromFieldClass {
  new: (...args: any[]) => any;
  fromFields: (fields: Field[]) => Fieldable;
  name: string;
  // Maybe this is wrong IDK
  prototype: {
    _fields?: any[];
  };
  sizeInFields?: () => number;
}

const errors = {
  fieldLengthNotMatching: (expected: number, actual: number) =>
    new Error(`Expected ${expected} field elements, got ${actual}`),

  typeNotCompatible: (name: string) =>
    new Error(
      `Cannot decode type ${name}, it has to be either a Struct, CircuitValue or built-in snarkyjs type`
    ),
};

export class MethodParameterDecoder {
  public static fromMethod(target: RuntimeModule<unknown>, methodName: string) {
    const paramtypes = Reflect.getMetadata(
      "design:paramtypes",
      target,
      methodName
    );

    return new MethodParameterDecoder(paramtypes);
  }

  private constructor(private readonly types: FromFieldClass[]) {}

  public fromFields(fields: Field[]): Fieldable[] {
    if (fields.length < this.fieldSize) {
      throw errors.fieldLengthNotMatching(this.fieldSize, fields.length);
    }

    let stack = fields.slice();

    return this.types.map((type) => {
      const numberFieldsNeeded =
        type.prototype._fields?.length ?? type.sizeInFields?.() ?? -1;
      if (numberFieldsNeeded === -1) {
        throw errors.typeNotCompatible(type.name);
      }
      const structFields = stack.slice(0, numberFieldsNeeded);
      stack = stack.slice(numberFieldsNeeded);
      return type.fromFields(structFields);
    });
  }

  public get fieldSize(): number {
    return this.types
      .map(
        (type) => type.prototype._fields?.length ?? type.sizeInFields?.() ?? 0
      )
      .reduce((a, b) => a + b, 0);
  }
}
