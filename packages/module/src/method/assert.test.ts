import "reflect-metadata";

import { Bool } from "snarkyjs";
import { container } from "tsyringe";

import { assert } from "./assert.js";
import { MethodExecutionContext } from "./MethodExecutionContext.js";

describe("assert", () => {
  const defaultStatusMessage = "something went wrong";
  const executionContext = container.resolve(MethodExecutionContext);

  beforeEach(() => {
    executionContext.beforeMethod("test");
  });

  afterEach(() => {
    executionContext.afterMethod();
  });

  describe.each([
    [true, undefined],
    [false, undefined],
    [false, defaultStatusMessage],
    // eslint-disable-next-line @typescript-eslint/naming-convention
  ])("status and message propagation", (status, statusMessage) => {
    it("should propagate the assertion status and message", () => {
      expect.assertions(2);

      assert(Bool(status), statusMessage);

      const { status: resultStatus, statusMessage: resultStatusMessage } = executionContext.current().result;

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
