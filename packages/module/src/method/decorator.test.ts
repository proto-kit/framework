import "reflect-metadata";

import { Bool, Field } from "snarkyjs";
import { container } from "tsyringe";
import { Option, StateTransition, MethodPublicInput } from "@yab/protocol";
// eslint-disable-next-line @typescript-eslint/no-shadow
import { jest } from "@jest/globals";

import { PlainRuntimeModule } from "../runtime/RuntimeModule.js";

import {
  runInContext,
  toStateTransitionsHash,
  toWrappedMethod,
  type WrappedMethod,
  type DecoratedMethod,
} from "./decorator.js";
import { MethodExecutionContext } from "./MethodExecutionContext.js";
import { Admin } from "../../test/modules/Admin";

const executionContext = container.resolve(MethodExecutionContext);

const expectedStatus = false;
const expectedErrorMessage = "test failure";
const argument = 5;

class TestModule extends PlainRuntimeModule {
  public succeed(foo: number) {
    executionContext.setStatus(Bool(expectedStatus));
    executionContext.addStateTransition(
      StateTransition.from(Field(0), new Option(Bool(false), Field(0), Field))
    );

    return foo;
  }

  public fail() {
    throw new Error(expectedErrorMessage);
  }
}

describe("runInContext", () => {
  describe("context capture", () => {
    it("should run a module method and capture its execution context", () => {
      expect.assertions(4);

      const {
        isFinished,
        result: { stateTransitions, status, value },
      } = Reflect.apply(runInContext, new TestModule(), [
        TestModule.prototype.succeed.name,

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, jest/unbound-method, @typescript-eslint/unbound-method
        TestModule.prototype.succeed as DecoratedMethod,
        [argument],
      ]);

      expect(status.toBoolean()).toBe(expectedStatus);
      expect(stateTransitions).toHaveLength(1);
      expect(value).toBe(argument);
      expect(isFinished).toBe(true);
    });

    it("should throw if the underlying method throws", () => {
      expect.assertions(1);

      expect(() =>
        Reflect.apply(runInContext, new TestModule(), [
          TestModule.prototype.fail.name,

          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, jest/unbound-method, @typescript-eslint/unbound-method
          TestModule.prototype.fail as DecoratedMethod,
          [],
        ])
      ).toThrow(expectedErrorMessage);
    });
  });
});

describe("toStateTransitionsHash", () => {
  const noneStateTransition = StateTransition.from(
    Field(0),
    new Option(Bool(false), Field(0), Field)
  );

  const someStateTransition = StateTransition.from(
    Field(0),
    new Option(Bool(true), Field(0), Field)
  );

  it.each([
    [
      [noneStateTransition],
      "7067243248312463521220230733411703436580237248681301130001246160136823979683",
    ],
    [
      [someStateTransition],
      "12841542804403638489097503092490970035615082088155587790175618374946575398395",
    ],
    [
      [noneStateTransition, someStateTransition],
      "20641278138648130746922286021889771603940136555847557324578879341962747943601",
    ],
    [
      [someStateTransition, noneStateTransition],
      "10362098987098600767020985423446775093761176563902435645494178193997179006954",
    ],
  ])(
    "should calculate a hash of all provided state transitions",
    (stateTransitions, expectedHash) => {
      expect.assertions(1);

      const hash = toStateTransitionsHash(stateTransitions).toString();

      expect(hash).toBe(expectedHash);
    }
  );
});

describe("toWrappedMethod", () => {
  let wrappedMethod: WrappedMethod;

  beforeAll(() => {
    jest.spyOn(TestModule.prototype, "succeed");

    wrappedMethod = Reflect.apply(toWrappedMethod, new TestModule(), [
      "succeed",

      // eslint-disable-next-line max-len
      // eslint-disable-next-line jest/unbound-method, @typescript-eslint/consistent-type-assertions, @typescript-eslint/unbound-method
      TestModule.prototype.succeed as DecoratedMethod,
    ]);
  });

  it("should return a wrapped method that calls the module method when invoked", () => {
    expect.assertions(1);

    const {
      result: { stateTransitions, status },
    } = Reflect.apply(runInContext, new TestModule(), [
      TestModule.prototype.succeed.name,

      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, jest/unbound-method, @typescript-eslint/unbound-method
      TestModule.prototype.succeed as DecoratedMethod,
      [argument],
    ]);

    const publicInput: MethodPublicInput = new MethodPublicInput({
      stateTransitionsHash: toStateTransitionsHash(stateTransitions),
      status,
      transactionHash: Field(0),
    });

    wrappedMethod(publicInput);

    // once to precompute, once during wrappedMethod
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jest.mocked(TestModule.prototype.succeed)).toHaveBeenCalledTimes(2);
  });

  it("should fail if the public input does not match the in-circuit execution values", () => {
    expect.assertions(1);

    const publicInput: MethodPublicInput = new MethodPublicInput({
      stateTransitionsHash: Field(0),
      status: Bool(true),
      transactionHash: Field(0),
    });

    expect(() => {
      wrappedMethod(publicInput);
    }).toThrow(
      /State transitions produced by '@method succeed' are not consistent/u
    );
  });
});
