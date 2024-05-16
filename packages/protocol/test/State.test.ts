import "reflect-metadata";
import { noop } from "@proto-kit/common";
import { Bool, Field, UInt64 } from "o1js";
import { container } from "tsyringe";

import {
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  State,
  SimpleAsyncStateService,
  StateServiceProvider,
} from "../src";

describe("state", () => {
  beforeEach(() => {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);

    executionContext.setup({
      transaction: undefined as unknown as RuntimeTransaction,
      networkState: undefined as unknown as NetworkState,
    });
  });

  it("should decode state correctly", async () => {
    expect.assertions(2);

    const state = State.from<UInt64>(UInt64);
    const stateService: SimpleAsyncStateService = {
      get: async () => [Field(123)],

      set: async () => {
        noop();
      },
    };
    state.stateServiceProvider = new StateServiceProvider();
    state.stateServiceProvider.setCurrentStateService(stateService);
    state.path = Field(1);

    const retrieved = await state.get();

    expect(retrieved.isSome).toStrictEqual(Bool(true));
    expect(retrieved.value).toStrictEqual(UInt64.from(123));
  });
});
