import "reflect-metadata";
import { ASTRecorder } from "../../../src/contracts/ast/ASTRecorder";
import {
  DefaultInstructions,
  DefaultInstructionsProxy,
} from "../../../src/contracts/ast/proxies/DefaultInstructions";
import { ASTReplayer } from "../../../src/contracts/ast/ASTReplayer";
import { expectDefined } from "@proto-kit/common";
import { Field, Bool, Provable, Poseidon, PublicKey, Void } from "o1js";
import { AST } from "../../../src/contracts/ast/AST";
import { ASTBuilder } from "../../../src/contracts/ast/ASTBuilder";
import {
  State,
  StateServiceProvider,
  RuntimeMethodExecutionContext,
  NetworkState,
  RuntimeTransaction,
} from "@proto-kit/protocol";
import { ASTState } from "../../../src/contracts/ast/proxies/State";
import { InMemoryStateService } from "@proto-kit/module";
import { container } from "tsyringe";
import {
  ContractExecutionContext
} from "../../../src/contracts/api/ContractExecutionContext";

describe("ast", () => {
  let recorder: ASTRecorder<typeof DefaultInstructions>;
  let executor: ASTReplayer<typeof DefaultInstructions>;

  beforeAll(() => {
    ({ recorder, executor } = new ASTBuilder(DefaultInstructions).initialize(
      DefaultInstructionsProxy
    ));
  });

  it("should have build and proxy", async () => {
    expectDefined(recorder);
    expectDefined(executor);
  });

  describe("witnesses", () => {
    const contract = async (f: Field) => {
      const s = Provable.witness(Field, () => {
        return Field(5).add(Field(100));
      });
      const s2 = await Provable.witnessAsync(Field, async () => {
        return Field(63).add(Field(8));
      });
      Provable.asProver(() => {
        Field(1).add(Field(5));
      });
      return f.add(s).add(s2);
    };

    let ast: AST<typeof DefaultInstructions>;

    it("should capture successfully", async () => {
      ast = await recorder.captureExecution(contract, Field, Field);

      expect(ast.outputs).toHaveLength(1);
      expect(Object.entries(ast.inputs).length).toBeGreaterThan(0);
      expect(ast.callStack).toHaveLength(2);
    });
  });

  describe("state", () => {
    const provider = new StateServiceProvider();

    const state = (() => {
      const state = new ASTState<Field>(Field);
      state.stateServiceProvider = provider;
      state.path = Field(5);
      return state;
    })();

    const contract = async (f: Field) => {
      const s = await state.get();
      const f2 = s.orElse(Field(0));
      await state.set(f2.add(Field(100)));
      return f;
    };

    const context = container.resolve(ContractExecutionContext);
    context.setup({
      networkState: NetworkState.empty(),
      transaction: RuntimeTransaction.dummyTransaction(),
    });

    let ast: AST<typeof DefaultInstructions>;

    it("should capture successfully", async () => {
      provider.setCurrentStateService(new InMemoryStateService());

      ast = await recorder.captureExecution(contract, Field, Field);

      expect(ast.outputs).toHaveLength(1);
      expect(Object.entries(ast.inputs).length).toBeGreaterThan(0);
      expect(ast.callStack).toHaveLength(4);
      provider.popCurrentStateService();
    });

    it("execution equality", async () => {
      context.clear();
      provider.setCurrentStateService(new InMemoryStateService());
      await provider.stateService.set(Field(5), [Field(1)]);

      const output = await executor.executeCircuitFromAST(
        ast,
        Field(5),
        Field,
        Field
      );
      const nativeOutput = await contract(Field(5));

      provider.popCurrentStateService();

      expect(output.toString()).toStrictEqual(nativeOutput.toString());
    });
  });

  const simpleExample = {
    contract: (f: Field) => {
      const f1 = Field(20);
      const f2 = Field(15);

      // const f4 = f.add(f1);
      // const f5 = f4.mul(f2);
      const f4 = f.mul(f2);

      const hash = Poseidon.hash([Field(0), Field(1)]);

      f4.add(f);

      // f4.assertEquals(20)
      // return f4.equals(Field(25 * 15));
      return hash;
    },
    input: () => Field(5),
  }

  describe.each([simpleExample])("simple example", ({ contract, input }) => {
    let ast: AST<typeof DefaultInstructions>;

    it("should capture successfully", async () => {
      ast = await recorder.captureExecution(contract, Field, Field);

      expect(ast.outputs).toHaveLength(1);
      expect(Object.entries(ast.inputs).length).toBeGreaterThan(0);
      expect(ast.callStack.length).toBeGreaterThan(0);
    });

    it("execution equality", async () => {
      const output = await executor.executeCircuitFromAST(
        ast,
        input(),
        Field,
        Field
      );
      const nativeOutput = contract(input());

      expect(output.toString()).toStrictEqual(nativeOutput.toString());
    });

    it("constraintsystem equality", async () => {
      const cs = await Provable.constraintSystem(async () => {
        const witness = Provable.witness(Field, input);
        const output = await executor.executeCircuitFromAST(
          ast,
          witness,
          Field,
          Field
        );
      });

      const nativeCs = await Provable.constraintSystem(() => {
        const witness = Provable.witness(Field, input);
        contract(witness);
      });

      expect(cs.rows).toStrictEqual(nativeCs.rows);
    });
  });

  test("test", async () => {
    // await proxyO1js();
    // Bool.prototype.toFields = new Proxy(Bool.prototype.toFields, {
    //   apply(target: any, thisArg: any, argArray: any[]): any {
    //       const r = Reflect.apply(target, thisArg, argArray) as any;
    //       Reflect.set(r[0], "test", "true");
    //       return r;
    //   },
    // });
    // const b = Bool(true).toFields();
    //
    // Reflect.defineMetadata("t2", "d", b[0].value)
    //
    // console.log()
  });
});
