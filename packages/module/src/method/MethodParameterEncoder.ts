/* eslint-disable @typescript-eslint/consistent-type-assertions */
import {
  Field,
  Proof,
  Provable,
  DynamicProof,
  FlexibleProvablePure,
} from "o1js";
import {
  ArgumentTypes,
  ProofTypes,
  ToFieldableStatic,
  TypedClass,
  filterNonUndefined,
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

type ArgumentType =
  | FlexibleProvablePure<any>
  | typeof Proof<unknown, unknown>
  | typeof DynamicProof<unknown, unknown>;

type ArgTypeArray = ArgumentType[];

type ArgArray = ArgumentTypes[];

function isProofType(type: unknown): type is typeof Proof {
  return (type as unknown as TypedClass<unknown>).prototype instanceof Proof;
}

function isDynamicProofType(type: unknown): type is typeof DynamicProof {
  return (
    (type as unknown as TypedClass<unknown>).prototype instanceof DynamicProof
  );
}

function isProofBaseType(
  type: unknown
): type is typeof Proof | typeof DynamicProof {
  return isProofType(type) || isDynamicProofType(type);
}

function getAllPropertyNamesOfPrototypeChain(type: unknown): string[] {
  if (type === undefined || type === null) {
    return [];
  }
  return Object.getOwnPropertyNames(type).concat(
    ...getAllPropertyNamesOfPrototypeChain(Object.getPrototypeOf(type))
  );
}

function isFlexibleProvablePure(
  type: unknown
): type is FlexibleProvablePure<unknown> {
  // The required properties are defined on the prototype for Structs and CircuitValues
  // but on the constructor function itself for Field and Bool
  // For aliases like Balance in library, it can even be 2 steps upwards the prototype chain
  const props = getAllPropertyNamesOfPrototypeChain(type);
  const mandatory = ["toFields", "fromFields", "sizeInFields"];
  return mandatory.every((prop) => props.includes(prop));
}

export class MethodParameterEncoder {
  public static fromMethod(target: RuntimeModule<unknown>, methodName: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const paramtypes: ArgTypeArray = Reflect.getMetadata(
      "design:paramtypes",
      target,
      methodName
    );

    if (paramtypes === undefined) {
      throw new Error(
        `Method with name ${methodName} doesn't exist on this module`
      );
    }

    const indizes = paramtypes
      .map((type, index) => {
        if (isProofBaseType(type) || isFlexibleProvablePure(type)) {
          return undefined;
        }
        return `${index}`;
      })
      .filter(filterNonUndefined);
    if (indizes.length > 0) {
      const indexString = indizes.reduce((a, b) => `${a}, ${b}`);
      throw new Error(
        `Not all arguments of method '${target.name}.${methodName}' are provable types or proofs (indizes: [${indexString}])`
      );
    }

    return new MethodParameterEncoder(paramtypes);
  }

  public static fieldSize(type: ArgumentType): number | undefined {
    if (isProofBaseType(type)) {
      return (
        (MethodParameterEncoder.fieldSize(type.publicInputType) ?? 0) +
        (MethodParameterEncoder.fieldSize(type.publicOutputType) ?? 0)
      );
    }
    // as any, since we shouldn't be using this workaround in the first place
    return (type as FlexibleProvablePure<unknown>).sizeInFields();
  }

  public constructor(private readonly types: ArgTypeArray) {}

  public decode(fields: Field[], auxiliary: string[]): Promise<ArgArray> {
    if (fields.length < this.fieldSize()) {
      throw errors.fieldLengthNotMatching(this.fieldSize(), fields.length);
    }

    let stack = fields.slice();
    const auxiliaryStack = auxiliary.slice();

    return Promise.all(
      this.types.map((type) => {
        const numberFieldsNeeded = MethodParameterEncoder.fieldSize(type) ?? -1;
        if (numberFieldsNeeded === -1) {
          throw errors.typeNotCompatible(type.constructor.name);
        }
        const structFields = stack.slice(0, numberFieldsNeeded);
        stack = stack.slice(numberFieldsNeeded);

        // Decode proof
        if (isProofBaseType(type)) {
          const auxiliaryData = auxiliaryStack.shift();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const proofData: { proof: string; maxProofsVerified: 0 | 1 | 2 } =
            JSON.parse(auxiliaryData!);

          const inputFieldSize = MethodParameterEncoder.fieldSize(
            type.publicInputType
          )!;
          const input = structFields
            .slice(0, inputFieldSize)
            .map((x) => x.toString());
          const output = structFields
            .slice(inputFieldSize)
            .map((x) => x.toString());

          // fromJSON has incompatible signature for Proof and DynamicProof
          if (isProofType(type)) {
            return type.fromJSON({
              ...proofData,
              publicInput: input,
              publicOutput: output,
            });
          }
          if (isDynamicProofType(type)) {
            return type.fromJSON({
              ...proofData,
              publicInput: input,
              publicOutput: output,
            });
          }
        }

        return (type as FlexibleProvablePure<unknown>).fromFields(
          structFields
        ) as any;
      })
    );
  }

  /**
   * Variant of encode() for provable code that skips the unprovable
   * json encoding
   */
  public encode(args: ArgumentTypes) {
    /**
     * Use the type info obtained previously to convert
     * the args passed to fields
     */
    return args
      .map((argument, index) => {
        if (argument instanceof Proof || argument instanceof DynamicProof) {
          const argumentType = this.types[index] as ProofTypes;

          const { publicOutputType, publicInputType } = argumentType;

          const inputFields =
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            publicInputType?.toFields(argument.publicInput as any) ?? [];

          const outputFields =
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            publicOutputType?.toFields(argument.publicOutput as any) ?? [];

          let auxiliary = "";

          // Has to be asProver, because this function will be called by runtimeMethod
          // to transform the args into a Field[] to compute the argsHash
          // In this case, the auxiliary might be empty, but it isn't used by that method anyways
          Provable.asProver(() => {
            const jsonProof = argument.toJSON();
            auxiliary = JSON.stringify({
              proof: jsonProof.proof,
              maxProofsVerified: jsonProof.maxProofsVerified,
            });
          });

          return {
            fields: [...inputFields, ...outputFields],
            auxiliary,
          };
        }

        const argumentType = this.types[index] as ToFieldableStatic;
        return {
          fields: argumentType.toFields(argument),
          auxiliary: undefined,
        };
      })
      .reduce<{
        fields: Field[];
        auxiliary: string[];
      }>(
        (a, b) => {
          return {
            fields: [...a.fields, ...b.fields],
            auxiliary:
              b.auxiliary !== undefined
                ? [...a.auxiliary, b.auxiliary]
                : a.auxiliary,
          };
        },
        { fields: [], auxiliary: [] }
      );
  }

  public fieldSize(): number {
    return this.types
      .map((type) => MethodParameterEncoder.fieldSize(type) ?? 0)
      .reduce((a, b) => a + b, 0);
  }
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */
