/* eslint-disable no-underscore-dangle */
import {
  Field,
  FlexibleProvable,
  Proof,
  Provable,
  ProvableExtended,
} from "o1js";
import {
  ArgumentTypes,
  ProofTypes,
  ToFieldable,
  ToFieldableStatic,
  ToJSONableStatic,
} from "@proto-kit/common";

import type { RuntimeModule } from "../runtime/RuntimeModule";

const errors = {
  fieldLengthNotMatching: (expected: number, actual: number) =>
    new Error(`Expected ${expected} field elements, got ${actual}`),

  typeNotCompatible: (name: string, error?: string) =>
    new Error(
      `Cannot decode type ${name}, it has to be either a Struct, CircuitValue or built-in snarkyjs type.${
        error !== undefined ? `Caused by: ${error}` : ""
      }`
    ),
};

type ArgsArray = ProvableExtended<unknown>[];

export class MethodParameterEncoder {
  public static fromMethod(target: RuntimeModule<unknown>, methodName: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const paramtypes: ArgsArray = Reflect.getMetadata(
      "design:paramtypes",
      target,
      methodName
    );

    if (paramtypes === undefined) {
      throw new Error(
        `Method with name ${methodName} doesn't exist on this module`
      );
    }

    return new MethodParameterEncoder(paramtypes);
  }

  public static fieldSize(type: ProvableExtended<unknown>): number | undefined {
    // as any, since we shouldn't be using this workaround in the first place
    return (type as any).prototype._fields?.length ?? type.sizeInFields?.();
  }

  private constructor(private readonly types: ArgsArray) {}

  public decode(argsJSON: string[]): FlexibleProvable<unknown>[] {
    return this.types.map((type, index) => {
      // eslint-disable-next-line @typescript-eslint/init-declarations
      let value: FlexibleProvable<unknown>;

      try {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        value = type.fromJSON(
          JSON.parse(argsJSON[index])
        ) as FlexibleProvable<unknown>;
      } catch (e: unknown) {
        if (e instanceof Error) {
          throw errors.typeNotCompatible(type.constructor.name, e.message);
        }
        throw errors.typeNotCompatible(type.constructor.name);
      }

      return value;
    });
  }

  public decodeFields(fields: Field[]): ArgumentTypes {
    if (fields.length < this.fieldSize) {
      throw errors.fieldLengthNotMatching(this.fieldSize, fields.length);
    }

    let stack = fields.slice();

    return this.types.map((type) => {
      const numberFieldsNeeded = MethodParameterEncoder.fieldSize(type) ?? -1;
      if (numberFieldsNeeded === -1) {
        throw errors.typeNotCompatible(type.constructor.name);
      }
      const structFields = stack.slice(0, numberFieldsNeeded);
      stack = stack.slice(numberFieldsNeeded);
      return type.fromFields(structFields, []) as ToFieldable;
    });
  }

  public encode(args: ArgumentTypes): {
    argsFields: Field[];
    argsJSON: string[];
  } {
    /**
     * Use the type info obtained previously to convert
     * the args passed to fields
     */
    const argsFields = args.flatMap((argument, index) => {
      if (argument instanceof Proof) {
        const argumentType = this.types[index] as ProofTypes;

        const publicOutputType = argumentType?.publicOutputType;

        const publicInputType = argumentType?.publicInputType;

        const inputFields =
          publicInputType?.toFields(argument.publicInput) ?? [];

        const outputFields =
          publicOutputType?.toFields(argument.publicOutput) ?? [];

        return [...inputFields, ...outputFields];
      }

      const argumentType = this.types[index] as ToFieldableStatic;
      return argumentType.toFields(argument);
    });

    let argsJSON: string[];

    Provable.asProver(() => {
      argsJSON = args.map((argument, index) => {
        if (argument instanceof Proof) {
          return JSON.stringify(argument.toJSON());
        }

        const argumentType = this.types[index] as ToJSONableStatic;
        return JSON.stringify(argumentType.toJSON(argument));
      });
    });

    return {
      argsFields,
      // @ts-expect-error
      argsJSON,
    };
  }

  public get fieldSize(): number {
    return this.types
      .map((type) => MethodParameterEncoder.fieldSize(type) ?? 0)
      .reduce((a, b) => a + b, 0);
  }
}
