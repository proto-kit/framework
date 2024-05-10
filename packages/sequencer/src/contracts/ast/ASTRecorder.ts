import { AST } from "./AST";
import {
  ToFieldable,
  ASTId,
  OpcodeDefinitions,
  ExtractParameters,
  ASTExecutionContext,
} from "./types";
import { getFieldVars, assertIsFieldable } from "./utils";
import { Field, ProvablePure } from "o1js";

export class ASTRecorder<Instructions extends OpcodeDefinitions>
  implements ASTExecutionContext<Instructions>
{
  private activeAst: AST<Instructions, any, any> | undefined;

  currentId: number = 0;

  capturing: boolean = false;

  // private astRouter: ASTExecutionContext;
  // public getRouter(): ASTExecutionContext {}

  public constructor() {}

  public registerInputs<InputType extends ToFieldable>(input: InputType) {
    const ids = this.identifyObject(input, "Input");
  }

  identifyObject(
    obj: ToFieldable,
    type: "Variable" | "Constant" | "Input" | "Output"
    // struct: ValueStruct,
    // type: ProvablePure<unknown>
  ): ASTId[] {
    const fields = getFieldVars(obj);

    return fields.map((field) => {
      const tag = this.getObjectTag(field);
      if (tag === undefined) {
        const id = (this.currentId++).toString();
        this.attachTagToObject(field, id);

        if (type === "Input") {
          this.activeAst!.inputs[id] = {
            type,
          };
        } else if (type === "Constant") {
          this.activeAst!.inputs[id] = {
            type,
            value: new Field(field).toString(),
          };
        }
        // Ignore variables as we don't define them explicitly
        // Ignore output as we set it explicitely afterwards

        return id;
      }
      return tag;
    });
  }

  attachTagToObject(obj: any, tag: ASTId) {
    Reflect.set(obj, "protokit_tag", tag);
  }

  getObjectTag(obj: any): ASTId | undefined {
    return Reflect.get(obj, "protokit_tag") as ASTId | undefined;
  }

  ensureArrayIsDefined<T>(arr: (T | undefined)[]): asserts arr is T[] {
    const undefinedIndex = arr.findIndex((v) => v === undefined);
    if (undefinedIndex !== -1) {
      throw new Error(`Index ${undefinedIndex} of array is not defined`);
    }
  }

  pushCall<Call extends keyof Instructions>(
    call: Call,
    f: (...args: ExtractParameters<Instructions[Call]>) => ToFieldable,
    args: ExtractParameters<Instructions[Call]>
  ): any {
    const ret = f(...args);
    let varIds: ASTId[] | undefined = undefined;

    if (ret) {
      varIds = this.identifyObject(ret, "Variable");
    }

    const argIds = args.map((v) => {
      const vArgIds = getFieldVars(v).map((f) => this.getObjectTag(f));
      this.ensureArrayIsDefined(vArgIds);
      return vArgIds;
    });

    this.activeAst!.callStack.push({
      call,
      parameters: argIds,
      result: varIds,
    });

    return ret;
  }

  private dummyInput<InputType extends ToFieldable>(
    inputType: ProvablePure<InputType>
  ): InputType {
    const fields = Array(inputType.sizeInFields())
      .fill(0)
      .map((x) => Field(0));
    return inputType.fromFields(fields);
  }

  public async captureExecution<InputType extends ToFieldable, OutputType>(
    f: (input: InputType) => Promise<OutputType> | OutputType,
    inputType: ProvablePure<InputType>
  ): Promise<AST<Instructions, InputType, OutputType>> {
    const ast = new AST<Instructions, InputType, OutputType>();
    this.activeAst = ast;
    this.capturing = true;

    const dummyInput = this.dummyInput(inputType);
    this.registerInputs(dummyInput);

    const output = await f(dummyInput);
    if (output) {
      assertIsFieldable(output);
      // Identify output (bcs they could be uninitilized constants)
      ast.outputs = this.identifyObject(output, "Output");
    }

    this.capturing = false;
    this.activeAst = undefined;
    return ast;
  }
}
