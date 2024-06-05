import { Field, Provable, InferProvable, ProvablePure } from "o1js";
import { AST } from "./AST";

// Utility types

type Tuple<T> = [T, ...T[]] | [];
type TupleToInstances<T extends Tuple<Provable<unknown>>> = {
  [I in keyof T]: InferProvable<T[I]>;
} & any[];

export type ToFieldable = {
  toFields(): Field[];
};

// AST types

export type ASTId = string;

export type FieldVar = Field["value"];

export interface ASTExecutionContext<
  Instructions extends OpcodeDefinitions,
  // InputType extends ToFieldable,
  // OutputType,
> {
  setInWitness(inWitnessBlock: boolean): void;
  setInProver(inProverBlock: boolean): void;

  get capturing(): boolean;

  getActiveAst(): AST<Instructions> | undefined

  identifyObject<T>(
    obj: T,
    objType: ProvablePure<T>,
    type: "Variable" | "Constant" | "Input"
  ): ASTId[];

  // Type better
  pushCall<Call extends keyof Instructions>(
    call: Call,
    f: (...args: ExtractParameters<Instructions[Call]>) => InferProvable<LastElement<Instructions[Call]>>,
    args: ExtractParameters<Instructions[Call]>,
  ): any;
}

type OpcodeDefinition<
  Parameters extends Tuple<ProvablePure<any>>,
  ReturnType extends ProvablePure<any>,
> = [...Parameters, ReturnType];

export type ExtractParameters<D extends OpcodeDefinition<any, any>> =
  D extends OpcodeDefinition<infer P, infer R> ? TupleToInstances<P> : [];

export type ExtractParameterTypes<D extends OpcodeDefinition<any, any>> =
  D extends OpcodeDefinition<infer P, infer R> ? P : [];

export type ExtractParametersWithoutThis<Params extends ToFieldable[]> =
  Params extends [infer A, ...infer P] ? P : never;
export type ExtractThisParameter<Params extends ToFieldable[]> =
  Params extends [infer A, ...infer P] ? A : undefined;

export type LastElement<Params extends any[]> = Params extends [...infer F, infer L] ? L : undefined;

export type OpcodeDefinitions = Record<
  string,
  OpcodeDefinition<Tuple<ProvablePure<any>>, ProvablePure<any>>
>;

export type ProxyInstructions<Opcodes extends OpcodeDefinitions> = {
  [Key in keyof Opcodes]: {
    proxyFunction(context: () => ASTExecutionContext<Opcodes>): void;
    execute: Opcodes[Key] extends OpcodeDefinition<
      infer Parameters,
      infer ReturnType
    >
      ? (
          ...args: TupleToInstances<Parameters>
        ) => Promise<InferProvable<ReturnType>> | InferProvable<ReturnType>
      : never;
  };
};
