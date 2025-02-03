import {
  Field,
  Void,
  InferProvable,
  Provable,
  Struct,
  Bool,
  ProvablePure,
} from "o1js";
import {
  OpcodeDefinitions,
  ProxyInstructions,
  ASTExecutionContext,
  ToFieldable,
} from "../types";
import { DynamicArray } from "./Poseidon";
import {
  StateServiceProvider,
  State,
  Option,
  ProvableHashList,
  DefaultProvableHashList,
  ProvableStateTransition,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { ContractExecutionContext } from "../../api/ContractExecutionContext";

export class DynamicArrayOption extends Struct({
  arr: DynamicArray,
  isSome: Bool,
}) {
  toFields() {
    return [...this.arr.arr, ...this.isSome.toFields()];
  }
}

export const StateInstructions = {
  "State.get": [Field, Field, DynamicArrayOption],
  "State.set": [Field, DynamicArray, Void],
} satisfies OpcodeDefinitions;

const stateServiceProvider = new StateServiceProvider();

export { stateServiceProvider as ASTStateServiceProvider };

export class ASTState<Value> extends State<Value> {
  public static context:
    | (() => ASTExecutionContext<typeof StateInstructions>)
    | undefined = undefined;

  public static list = new DefaultProvableHashList(ProvableStateTransition);

  // public constructor(private readonly type: ProvablePure<Val>) {
  //   super();
  // }

  protected override getContext() {
    return container.resolve(ContractExecutionContext);
  }

  async get(): Promise<Option<Value>> {
    if (ASTState.context) {
      const context = ASTState.context();

      if (context.capturing) {
        const pathId = context.identifyObject(this.path!, Field, "Constant");
        const numFieldsConstant = context.identifyObject(
          new Field(this.valueType.sizeInFields()),
          Field,
          "Constant"
        );

        const value = await super.get();

        const ids = context.identifyObject(
          value,
          Struct({ value: this.valueType, isSome: Bool }),
          "Variable"
        );

        context.getActiveAst()!.callStack.push({
          call: "State.get",
          parameters: [pathId, numFieldsConstant],
          result: ids,
        });
        return value;
      }
    }
    return await super.get();
  }

  public async set(value: Value): Promise<void> {
    if (ASTState.context) {
      const context = ASTState.context();

      if (context.capturing) {
        const pathId = context.identifyObject(this.path!, Field, "Constant");
        const valueIds = context.identifyObject(
          value,
          this.valueType as ProvablePure<Value>,
          "Constant"
        );

        await super.set(value);

        context.getActiveAst()!.callStack.push({
          call: "State.set",
          parameters: [pathId, valueIds],
          result: [],
        });
      }
    }
    await super.set(value);
  }
}

export const StateInstructionProxy = {
  "State.set": {
    execute: async (path: Field, array: InferProvable<typeof DynamicArray>) => {
      const arrayType = Provable.Array(Field, array.arr.length);
      const state = new State(arrayType);
      state.path = path;
      state.stateServiceProvider = stateServiceProvider;
      await state.set(array.arr);
    },
    proxyFunction(
      context: () => ASTExecutionContext<typeof StateInstructions>
    ) {
      ASTState.context = context;
    },
  },
  "State.get": {
    execute: async (path: Field, size: Field) => {
      // size field is a workaround for telling us the size here.
      if (!size.isConstant()) {
        throw new Error("Size field has to be a constant");
      }

      const arrayType = Struct({
        arr: Provable.Array(
          Field,
          Number(size.toBigInt().toString())
        )
      });
      const state = new ASTState(arrayType);
      state.path = path;
      state.stateServiceProvider = stateServiceProvider;

      const result = await state.get();
      return new DynamicArrayOption({
        arr: result.value,
        isSome: result.isSome,
      });
    },
    proxyFunction(
      context: () => ASTExecutionContext<typeof StateInstructions>
    ) {
      ASTState.context = context;
    },
  },
} satisfies ProxyInstructions<typeof StateInstructions>;
