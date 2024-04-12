import "reflect-metadata";
import { noop } from "@proto-kit/common";
import { Bool, Field, UInt64 } from "o1js";
import { container } from "tsyringe";

import {
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  State,
  StateService,
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

  it("should decode state correctly", () => {
    expect.assertions(2);

    const state = State.from<UInt64>(UInt64);
    const stateService: StateService = {
      get: () => [Field(123)],

      set: () => {
        noop();
      },
    };
    state.stateServiceProvider = new StateServiceProvider();
    state.stateServiceProvider.setCurrentStateService(stateService);
    state.path = Field(1);

    const retrieved = state.get();

    expect(retrieved.isSome).toStrictEqual(Bool(true));
    expect(retrieved.value).toStrictEqual(UInt64.from(123));
  });
});
