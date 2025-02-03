import { ASTId, OpcodeDefinitions } from "./types";

export type InputHeapRecord =
  | {
      type: "Constant";
      value: string;
    }
  | {
      type: "Input";
    };

export class AST<InstructionSet extends OpcodeDefinitions> {
  inputs: Record<ASTId, InputHeapRecord> = {};

  outputs: ASTId[] = [];

  callStack: {
    call: keyof InstructionSet;
    parameters: ASTId[][];
    result?: ASTId[];
  }[] = [];
}

export function checkASTIntegrity<InstructionSet extends OpcodeDefinitions>(ast: AST<InstructionSet>, ) {

}