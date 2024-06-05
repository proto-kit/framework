import { Field, ProvablePure } from "o1js";
import { ToFieldable } from "@proto-kit/common";
import { ASTId, FieldVar, OpcodeDefinitions, ProxyInstructions } from "./types";
import { AST } from "./AST";
import { getFieldVars } from "./utils";

export class ASTReplayer<Instructions extends OpcodeDefinitions> {
  constructor(
    private instructions: Instructions,
    private proxyInstructions: ProxyInstructions<Instructions>
  ) {}

  heap: Record<ASTId, FieldVar> = {};

  // TODO Remove ToFieldable
  public async executeCircuitFromAST<Input, Output>(
    ast: AST<Instructions>,
    input: Input,
    inputType: ProvablePure<Input>,
    outputType: ProvablePure<Output>
  ): Promise<Output> {
    let usedInputs = 0;

    const inputFields = getFieldVars(input, inputType);

    Object.entries(ast.inputs).forEach(([id, entry]) => {
      if (entry.type === "Constant") {
        this.heap[id] = Field(entry.value).value; // Try [0, [0, BigInt(entry.value)]]
      } else if (entry.type === "Input") {
        const input = inputFields[usedInputs++];
        if (input === undefined) {
          throw new Error(`Input with id ${id} not given`);
        }
        this.heap[id] = input;
      }
    });

    for (const call of ast.callStack) {
      const parametersFields = call.parameters.map((ids) =>
        ids.map((id) => this.heap[id])
      );

      const types = this.instructions[call.call];
      const decodedParameters = parametersFields.map((fields, index) => {
        return types[index].fromFields(
          fields.map((fieldVar) => new Field(fieldVar))
        );
      });

      // eslint-disable-next-line no-await-in-loop
      const f = await this.proxyInstructions[call.call].execute(
        ...(decodedParameters as any)
      );
      if (f && call.result) {
        const vars = getFieldVars(f, types.at(-1)!);
        call.result.map((resultId, index) => {
          this.heap[resultId] = vars[index];
        });
      }
    }

    const fields = ast.outputs.map((id) => this.heap[id]).map(Field);
    const output = outputType.fromFields(fields);
    return output;
  }
}
