import { ASTRecorder } from "../../../src/contracts/ast/ASTRecorder";
import {
  DefaultInstructions,
  DefaultInstructionsProxy,
} from "../../../src/contracts/ast/proxies/DefaultInstructions";
import { ASTReplayer } from "../../../src/contracts/ast/ASTReplayer";
import { expectDefined } from "@proto-kit/common";
import { Field, Bool, Provable, Poseidon } from "o1js";
import { AST } from "../../../src/contracts/ast/AST";
import { ASTBuilder } from "../../../src/contracts/ast/ASTBuilder";

describe("ast", () => {
  let recorder: ASTRecorder<typeof DefaultInstructions>;
  let executor: ASTReplayer<typeof DefaultInstructions>;

  it("should build and proxy", async () => {
    ({ recorder, executor } = new ASTBuilder(DefaultInstructions).initialize(
      DefaultInstructionsProxy
    ));
    expectDefined(recorder);
    expectDefined(executor);
  });

  describe("simple example", () => {
    const contract = (f: Field) => {
      const f1 = Field(20);
      const f2 = Field(15);

      // const f4 = f.add(f1);
      // const f5 = f4.mul(f2);
      const f4 = f.mul(f2);

      const hash = Poseidon.hash([Field(0), Field(1)]);

      // f4.assertEquals(20)
      // return f4.equals(Field(25 * 15));
      return hash;
    };

    let ast: AST<typeof DefaultInstructions, Field, Field>;

    it("should capture successfully", async () => {
      ast = await recorder.captureExecution(contract, Field);

      expect(ast.outputs).toHaveLength(1);
      expect(Object.entries(ast.inputs).length).toBeGreaterThan(0);
      expect(ast.callStack).toHaveLength(2);
    });

    it("execution equality", async () => {
      const output = executor.executeCircuitFromAST(ast, Field(5), Field);
      const nativeOutput = contract(Field(5));

      expect(output.toString()).toStrictEqual(nativeOutput.toString());
    });

    it("constraintsystem equality", async () => {
      const cs = await Provable.constraintSystem(() => {
        const witness = Provable.witness(Field, () => Field(5));
        const output = executor.executeCircuitFromAST(ast, witness, Bool);
      });

      const nativeCs = await Provable.constraintSystem(() => {
        const witness = Provable.witness(Field, () => Field(5));
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
