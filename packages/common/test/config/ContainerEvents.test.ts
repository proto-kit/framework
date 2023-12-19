import "reflect-metadata";
import {
  BaseModuleInstanceType,
  BaseModuleType,
  ConfigurableModule,
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  ModuleContainer,
  ModulesRecord, TypedClass
} from "../../src";
import { injectable, container as tsyringeContainer } from "tsyringe";

class TestContainer<
  Modules extends ModulesRecord
> extends ModuleContainer<Modules> {}

interface TestEvents extends EventsRecord {
  test: [string];
}

@injectable()
class TestModule
  extends ConfigurableModule<{}>
  implements BaseModuleInstanceType, EventEmittingComponent<TestEvents>
{
  events = new EventEmitter<TestEvents>();
}

describe("test event propagation", () => {
  it("should work corretly", () => {
    const container = new TestContainer({
      modules: {
        test: TestModule
      }
    })

    container.create(() => tsyringeContainer.createChildContainer())

    type X = {
      test: TypedClass<TestModule>
    }
    type Y = Flatten<X>


    const t: Y = {

    }

    // container.events.
  });
});
