import "reflect-metadata";
import {
  State,
  StateServiceProvider,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  NetworkState,
} from "@proto-kit/protocol";
import { UInt64, Field } from "o1js";
import { InMemoryStateService } from "@proto-kit/module";
import { container } from "tsyringe";

describe("interop uint <-> state", () => {
  it("should deserialize as a correct class instance coming from state", async () => {
    const state = new State<UInt64>(UInt64);
    const service = new InMemoryStateService();
    const provider = new StateServiceProvider();
    state.path = Field(0);
    state.stateServiceProvider = provider;
    provider.setCurrentStateService(service);

    await service.set(state.path, [Field(10)]);

    const context = container.resolve(RuntimeMethodExecutionContext);
    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    const uint = await state.get();
    const uint2 = uint.value.add(5);
    expect(uint2.toString()).toStrictEqual("15");
  });
});
