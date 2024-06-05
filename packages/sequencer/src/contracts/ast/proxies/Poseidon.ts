import {
  Field,
  Bool,
  Void,
  Poseidon,
  ProvablePure,
  Struct,
  Provable, PublicKey, InferProvable
} from "o1js";
import {
  OpcodeDefinitions,
  ProxyInstructions,
  ASTExecutionContext, ToFieldable
} from "../types";

type F = (this: string[]) => boolean

const f: F = () => {
  return true
}

const DynamicArray = Struct({
  arr: Provable.Array(Field, 1)
})
DynamicArray.fromFields = (arr: Field[]) => new DynamicArray({ arr })
DynamicArray.toFields = ({ arr }: { arr: Field[] }) => arr

export { DynamicArray };

export const PoseidonInstructions = {
  "Poseidon.hash": [DynamicArray, Field],
} satisfies OpcodeDefinitions;

export const PoseidonInstructionsProxy = {
  "Poseidon.hash": {
    execute: (fields: InferProvable<typeof DynamicArray>) =>
      Poseidon.hash(DynamicArray.toFields(fields)),
    proxyFunction: (contextF: () => ASTExecutionContext<typeof PoseidonInstructions>) => {
      Poseidon.hash = new Proxy(Poseidon.hash, {
        apply(
          target: typeof Poseidon.hash,
          thisArg: typeof Poseidon,
          argArray: [Field[]]
        ): any {
          const context = contextF();
          if (!context.capturing) {
            return Reflect.apply(target, thisArg, argArray);
          }
          const dynamicArray = DynamicArray.fromFields(argArray[0]) as unknown as InferProvable<typeof DynamicArray> & ToFieldable;
          context.identifyObject(dynamicArray, DynamicArray, "Constant");

          const boundTarget = target.bind(thisArg);
          const ret = context.pushCall<"Poseidon.hash">(
            "Poseidon.hash",
            (args: { arr: Field[]}) => boundTarget(args.arr),
            [dynamicArray],
          );

          return ret;
        },
      });
    },
  },
} satisfies ProxyInstructions<typeof PoseidonInstructions>;
