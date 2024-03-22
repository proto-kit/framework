import "reflect-metadata";

import { Bool } from "o1js";
import { container } from "tsyringe";

import { assert } from "../../../src/state/assert/assert";
import { RuntimeMethodExecutionContext } from "../../../src/state/context/RuntimeMethodExecutionContext";
import { RuntimeTransaction } from "../../../src/model/transaction/RuntimeTransaction";
import { NetworkState } from "../../../src/model/network/NetworkState";

describe("assert", () => {
  const defaultStatusMessage = "something went wrong";
  const executionContext = container.resolve(RuntimeMethodExecutionContext);

  beforeEach(() => {
    executionContext.beforeMethod("testConstructor", "test", []);

    executionContext.setup({
      transaction: undefined as unknown as RuntimeTransaction,
      networkState: undefined as unknown as NetworkState,
    });
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
