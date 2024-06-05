import { AST } from "./AST";
import {
  ToFieldable,
  ASTId,
  OpcodeDefinitions,
  ExtractParameters,
  ASTExecutionContext,
  ExtractParameterTypes,
  LastElement,
} from "./types";
import { getFieldVars, assertIsFieldable, cleanFieldVars } from "./utils";
import { Field, ProvablePure, InferProvable, Provable } from "o1js";

export class ASTRecorder<Instructions extends OpcodeDefinitions>
  implements ASTExecutionContext<Instructions>
{
  public constructor(private readonly instructionSet: Instructions) {}

  private activeAst: AST<Instructions> | undefined;

  currentId: number = 0;

  private inCapturing: boolean = false;
  public inWitnessBlock: boolean = false;
  public inProverBlock: boolean = false;

  public setInProver(inProverBlock: boolean): void {
    if (this.inCapturing) {
      this.inProverBlock = inProverBlock;
    }
  }

  public setInWitness(inWitnessBlock: boolean): void {
    if (this.inCapturing) {
      this.inWitnessBlock = inWitnessBlock;
    }
  }

  public get capturing(): boolean {
    return this.inCapturing && !this.inWitnessBlock && !this.inProverBlock;
  }

  public getActiveAst(): AST<Instructions> | undefined {
    return this.activeAst;
  }

  public registerInputs<InputType>(
    input: InputType,
    inputType: ProvablePure<InputType>
  ) {
    const ids = this.identifyObject(input, inputType, "Input");
  }

  identifyObject<T>(
    obj: T,
    objType: ProvablePure<T>,
    type: "Variable" | "Constant" | "Input" | "Output"
    // struct: ValueStruct,
    // type: ProvablePure<unknown>
  ): ASTId[] {
    let fields = getFieldVars(obj, objType);

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
    f: (
      ...args: ExtractParameters<Instructions[Call]>
    ) => InferProvable<LastElement<Instructions[Call]>>,
    args: ExtractParameters<Instructions[Call]>
  ): any {
    let ret = f(...args);
    let varIds: ASTId[] | undefined = undefined;

    const argsTypes = this.instructionSet[call].slice(0, -1);
    const returnType = this.instructionSet[call].slice(-1)[0];

    if (ret) {
      ret = returnType.fromFields(
        cleanFieldVars(getFieldVars(ret, returnType)).map((fieldVar) =>
          Field(fieldVar)
        )
      );
      varIds = this.identifyObject(ret, returnType, "Variable");
    }

    const argIds = args.map((v, index) => {
      const vType = argsTypes[index];
      const vArgIds = getFieldVars(v, vType).map((f) => this.getObjectTag(f));
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

  private dummyInput<InputType>(inputType: ProvablePure<InputType>): InputType {
    const fields = Array(inputType.sizeInFields())
      .fill(0)
      .map((x) => Field(0));
    return inputType.fromFields(fields);
  }

  public async captureExecution<InputType, OutputType>(
    f: (input: InputType) => Promise<OutputType> | OutputType,
    inputType: ProvablePure<InputType>,
    outputType: ProvablePure<OutputType>
  ): Promise<AST<Instructions>> {
    const ast = new AST<Instructions>();
    this.activeAst = ast;
    this.inCapturing = true;

    // Execute as constraintSystem so that variables are not constants,
    // therefore now throwing errors on invalid operations (i.e. div by 0)
    await Provable.constraintSystem(async () => {
      const dummyInput = Provable.witness(inputType, () =>
        this.dummyInput(inputType)
      );
      this.registerInputs(dummyInput, inputType);

      const output = await f(dummyInput);
      if (output) {
        assertIsFieldable(output);
        // Identify output (bcs they could be uninitilized constants)
        ast.outputs = this.identifyObject(output, outputType, "Output");
      }
    });

    this.inCapturing = false;
    this.activeAst = undefined;
    return ast;
  }
}
