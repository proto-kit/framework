import { ToFieldable, ASTId, OpcodeDefinitions } from "./types";

export type InputHeapRecord =
  | {
  type: "Constant";
  value: string;
}
  | {
  type: "Input";
};

export class AST<InstructionSet extends OpcodeDefinitions, InputType extends ToFieldable, OutputType> {
  inputs: Record<ASTId, InputHeapRecord> = {};

  outputs: ASTId[] = [];

  callStack: {
    call: keyof InstructionSet;
    parameters: ASTId[][];
    result?: ASTId[];
  }[] = [];

  public constructor(
  ) {}
}