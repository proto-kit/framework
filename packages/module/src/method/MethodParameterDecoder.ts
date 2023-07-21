import { Field } from "snarkyjs";

import { RuntimeModule } from "../runtime/RuntimeModule";

export interface Fieldable {
  toFields: () => Field[];
}

export interface FromFieldClass {
  new: (...args: any[]) => any;
  fromFields: (fields: Field[]) => Fieldable;
  // Maybe this is wrong IDK
  prototype: {
    _fields: any[];
  };
}

const errors = {
  fieldLengthNotMatching: (expected: number, actual: number) =>
    new Error(`Expected ${expected} field elements, got ${actual}`),
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
      // eslint-disable-next-line no-underscore-dangle
      const numberFieldsNeeded = type.prototype._fields.length;
      const structFields = stack.slice(0, numberFieldsNeeded);
      stack = stack.slice(numberFieldsNeeded);
      return type.fromFields(structFields);
    });
  }

  public get fieldSize(): number {
    return this.types
      .map((type) => type.prototype._fields.length)
      .reduce((a, b) => a + b);
  }
}
