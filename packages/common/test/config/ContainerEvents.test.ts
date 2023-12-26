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
import {
  ContainerEvents,
  FlattenedContainerEvents,
  FlattenObject
} from "../../src/events/EventEmitterProxy";

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

interface TestEvents2 extends EventsRecord {
  test2: [number];
}

class TestModule2
  extends ConfigurableModule<{}>
  implements BaseModuleInstanceType, EventEmittingComponent<TestEvents2> {
  events = new EventEmitter()
}

type X = {
  test: TypedClass<TestModule>,
  test2: TypedClass<TestModule2>
}
type Y = FlattenObject<ContainerEvents<X>>
type Z = FlattenedContainerEvents<X>
const y: Y = {
  test: ["asd"],
  // test2: [2]
}

describe("test event propagation", () => {
  it("should work corretly", () => {
    const container = new TestContainer({
      modules: {
        test: TestModule,
        test2: TestModule2
      }
    })

    container.create(() => tsyringeContainer.createChildContainer())

    container.events.on("test", (s: unknown) => {

    })
  });
});
