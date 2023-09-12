import "reflect-metadata";

import { Bool } from "snarkyjs";
import { container } from "tsyringe";

import { assert } from "./assert";
import { RuntimeMethodExecutionContext } from "../context/RuntimeMethodExecutionContext";

describe("assert", () => {
  const defaultStatusMessage = "something went wrong";
  const executionContext = container.resolve(RuntimeMethodExecutionContext);

  beforeEach(() => {
    executionContext.beforeMethod("testConstructor", "test", []);
  });

  afterEach(() => {
    executionContext.afterMethod();
  });

  describe.each([
    [true, undefined],
    [false, undefined],
    [false, defaultStatusMessage],
  ])("status and message propagation", (status, statusMessage) => {
    it("should propagate the assertion status and message", () => {
      expect.assertions(2);

      assert(Bool(status), statusMessage);

      const { status: resultStatus, statusMessage: resultStatusMessage } =
        executionContext.current().result;

      expect(status).toBe(resultStatus.toBoolean());
      expect(statusMessage).toBe(resultStatusMessage);
    });
  });

  it("should keep a false status, once it was already set", () => {
    expect.assertions(1);

    assert(Bool(false));
    assert(Bool(true));

    const { status } = executionContext.current().result;

    expect(status.toBoolean()).toBe(false);
  });
});
