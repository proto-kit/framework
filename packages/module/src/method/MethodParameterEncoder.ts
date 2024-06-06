/* eslint-disable no-underscore-dangle,@typescript-eslint/consistent-type-assertions */
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

// TODO Not typed correctly, also Proofs are possible, which have async fromJSON()
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

  public async decode(
    argsJSON: string[]
  ): Promise<FlexibleProvable<unknown>[]> {
    return await this.types.reduce<Promise<FlexibleProvable<unknown>[]>>(
      async (arrayPromise, type, index) => {
        const array = await arrayPromise;
        let value: FlexibleProvable<unknown>;

        try {
          // fromJSON() can be async in the case of Proofs - not typed correctly
          value = (await type.fromJSON(
            JSON.parse(argsJSON[index])
          )) as FlexibleProvable<unknown>;
        } catch (e: unknown) {
          if (e instanceof Error) {
            throw errors.typeNotCompatible(type.constructor.name, e.message);
          }
          throw errors.typeNotCompatible(type.constructor.name);
        }

        return [...array, value];
      },
      Promise.resolve([])
    );
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

  /**
   * Variant of encode() for provable code that skips the unprovable
   * json encoding
   */
  public encodeAsFields(args: ArgumentTypes) {
    /**
     * Use the type info obtained previously to convert
     * the args passed to fields
     */
    return args.flatMap((argument, index) => {
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
  }

  public encode(args: ArgumentTypes): {
    argsFields: Field[];
    argsJSON: string[];
  } {
    const argsFields = this.encodeAsFields(args);

    let argsJSON: string[] = [];
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
      argsJSON,
    };
  }

  public get fieldSize(): number {
    return this.types
      .map((type) => MethodParameterEncoder.fieldSize(type) ?? 0)
      .reduce((a, b) => a + b, 0);
  }
}
/* eslint-enable no-underscore-dangle,@typescript-eslint/consistent-type-assertions */
