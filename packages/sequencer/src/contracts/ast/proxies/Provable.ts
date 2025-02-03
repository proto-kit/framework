import {
  Field,
  InferProvable,
  Poseidon,
  Provable,
  Bool,
  FlexibleProvable,
  Void,
  ProvablePure,
} from "o1js";
import {
  OpcodeDefinitions,
  ASTExecutionContext,
  ToFieldable,
  ProxyInstructions,
} from "../types";
import { DynamicArray } from "./Poseidon";
import { cleanFieldVars } from "../utils";

export const ProvableInstructions = {
  "Provable.witness": [Void],
  "Provable.witnessAsync": [Void],
  "Provable.asProver": [Void],
  "Provable.if": [Bool, DynamicArray, DynamicArray, DynamicArray],
} satisfies OpcodeDefinitions;

export const ProvableInstructionsProxy = {
  "Provable.witness": {
    execute: () => {},
    proxyFunction(
      contextF: () => ASTExecutionContext<typeof ProvableInstructions>
    ) {
      Provable.witness = new Proxy(Provable.witness, {
        apply(
          target: typeof Provable.witness,
          thisArg: typeof Provable,
          args: any[]
        ) {
          const context = contextF();
          context.setInWitness(true);
          const r = Reflect.apply(target, thisArg, args);
          context.setInWitness(false);
          return r;
        },
      });
    },
  },

  "Provable.witnessAsync": {
    execute: () => {},
    proxyFunction(
      contextF: () => ASTExecutionContext<typeof ProvableInstructions>
    ) {
      Provable.witnessAsync = new Proxy(Provable.witnessAsync, {
        async apply(
          target: typeof Provable.witnessAsync,
          thisArg: typeof Provable,
          args: any[]
        ) {
          const context = contextF();
          context.setInWitness(true);
          const r = await Reflect.apply(target, thisArg, args);
          context.setInWitness(false);
          return r;
        },
      });
    },
  },

  "Provable.asProver": {
    execute: () => {},
    proxyFunction(
      contextF: () => ASTExecutionContext<typeof ProvableInstructions>
    ) {
      Provable.asProver = new Proxy(Provable.asProver, {
        apply(
          target: typeof Provable.asProver,
          thisArg: typeof Provable,
          args: any[]
        ) {
          const context = contextF();
          context.setInProver(true);
          Reflect.apply(target, thisArg, args);
          context.setInProver(false);
        },
      });
    },
  },

  "Provable.if": {
    execute: (
      condition: Bool,
      a: InferProvable<typeof DynamicArray>,
      b: InferProvable<typeof DynamicArray>
    ) => Provable.if(condition, DynamicArray, a, b),
    proxyFunction: (
      contextF: () => ASTExecutionContext<typeof ProvableInstructions>
    ) => {
      Provable.if = new Proxy(Provable.if, {
        apply(
          target: typeof Provable.if,
          thisArg: typeof Provable,
          argArray: [Bool, any | FlexibleProvable<any>, any, any | undefined]
        ): any {
          const context = contextF();
          if (!context.capturing) {
            return Reflect.apply(target, thisArg, argArray);
          }

          const [condition, typeOrX, xOrY, yOrUndefined] = argArray;

          let a: InferProvable<typeof DynamicArray>;
          let b: InferProvable<typeof DynamicArray>;

          if (yOrUndefined === undefined) {
            // Implicit case
            a = { arr: (typeOrX as ToFieldable).toFields() };
            b = { arr: (xOrY as ToFieldable).toFields() };
          } else {
            // Explicit case
            const type = typeOrX as ProvablePure<unknown>;
            a = { arr: type.toFields(xOrY) };
            b = { arr: type.toFields(yOrUndefined) };
          }

          const conditionId = context.identifyObject(
            condition,
            Bool,
            "Constant"
          );
          const aIds = context.identifyObject(a, DynamicArray, "Constant");
          const bIds = context.identifyObject(b, DynamicArray, "Constant");

          const boundTarget = target.bind(thisArg);
          const ret = context.pushCall<"Provable.if">(
            "Provable.if",
            (
              condition: Bool,
              a: InferProvable<typeof DynamicArray>,
              b: InferProvable<typeof DynamicArray>
            ) => boundTarget(condition, DynamicArray, a, b),
            [condition, a, b],
          );

          // const context = contextF();
          // const dynamicArray = DynamicArray.fromFields(argArray[0]) as unknown as InferProvable<typeof DynamicArray> & ToFieldable;
          // context.identifyObject(dynamicArray, "Constant");
          //

          if(yOrUndefined === undefined) {
            // Implicit case
            // Workaround
            return typeOrX.constructor.fromFields(ret.arr)
          } else {
            // Explicit case
            return (typeOrX as ProvablePure<unknown>).fromFields(ret.arr);
          }
        },
      });
    },
  },
} satisfies ProxyInstructions<typeof ProvableInstructions>;
