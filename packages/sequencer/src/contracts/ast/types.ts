import { Field, Provable, InferProvable, ProvablePure } from "o1js";

// Utility types

type Tuple<T> = [T, ...T[]] | [];
type TupleToInstances<T extends Tuple<Provable<unknown>>> = {
  [I in keyof T]: InferProvable<T[I]> & ToFieldable;
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
  get capturing(): boolean;

  identifyObject(
    obj: ToFieldable,
    type: "Variable" | "Constant" | "Input"
  ): ASTId[];

  // Type better
  pushCall<Call extends keyof Instructions>(
    call: Call,
    f: (...args: ExtractParameters<Instructions[Call]>) => ToFieldable,
    args: ExtractParameters<Instructions[Call]>
  ): any;
}

type OpcodeDefinition<
  Parameters extends Tuple<ProvablePure<any>>,
  ReturnType extends ProvablePure<any>,
> = [...Parameters, ReturnType];

export type ExtractParameters<D extends OpcodeDefinition<any, any>> = D extends OpcodeDefinition<infer P, infer R> ? TupleToInstances<P> : [];

export type ExtractParametersWithoutThis<Params extends ToFieldable[]> = Params extends [infer A, ...infer P] ? P : never;
export type ExtractThisParameter<Params extends ToFieldable[]> = Params extends [infer A, ...infer P] ? A : undefined;

export type OpcodeDefinitions = Record<string, OpcodeDefinition<Tuple<ProvablePure<any>>, ProvablePure<any>>>;

export type ProxyInstructions<Opcodes extends OpcodeDefinitions> = {
  [Key in keyof Opcodes]: {
    proxyFunction(context: () => ASTExecutionContext<Opcodes>): void,
    execute: Opcodes[Key] extends OpcodeDefinition<infer Parameters, infer ReturnType> ? ((...args: TupleToInstances<Parameters>) => InferProvable<ReturnType>) : never;
  };
}