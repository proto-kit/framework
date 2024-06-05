import "reflect-metadata";
import { injectable, container as tsyringeContainer } from "tsyringe";

import {
  BaseModuleInstanceType,
  ConfigurableModule,
  EventEmitter,
  EventEmittingComponent,
  ModuleContainer,
  ModulesRecord,
} from "../../src";

class TestContainer<
  Modules extends ModulesRecord,
> extends ModuleContainer<Modules> {}

type TestEvents = {
  test: [string];
};

@injectable()
class TestModule
  extends ConfigurableModule<{}>
  implements BaseModuleInstanceType, EventEmittingComponent<TestEvents>
{
  events = new EventEmitter<TestEvents>();
}

type TestEvents2 = {
  test2: [number];
};

class TestModule2
  extends ConfigurableModule<{}>
  implements BaseModuleInstanceType, EventEmittingComponent<TestEvents2>
{
  events = new EventEmitter<TestEvents2>();
}

describe("test event propagation", () => {
  it("should propagate events up", () => {
    expect.assertions(1);

    const container = new TestContainer({
      modules: {
        test: TestModule,
        test2: TestModule2,
      },
    });

    container.configure({
      test: {},
      test2: {},
    });

    container.create(() => tsyringeContainer.createChildContainer());

    const testvalue = "testString123";

    container.events.on("test", (value: string) => {
      expect(value).toStrictEqual(testvalue);
    });

    const module = container.resolve("test");
    module.events.emit("test", testvalue);
  });
});
