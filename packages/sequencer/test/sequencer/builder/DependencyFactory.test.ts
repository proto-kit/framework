import "reflect-metadata";
import { container, DependencyContainer } from "tsyringe";

import {
  dependency,
  DependencyFactory,
  dependencyFactory,
} from "@proto-kit/common";

class DummyDependency {
  public constructor(public dummyString: string) {}

  public dummy(): string {
    return this.dummyString;
  }
}

const dummyStringValue = "thisIsADummyString";

@dependencyFactory()
class DummyDependencyFactory extends DependencyFactory {
  @dependency()
  public dummy(): DummyDependency {
    return new DummyDependency(dummyStringValue);
  }
}

describe("dependencyFactory", () => {
  let dependencyContainer: DependencyContainer;

  beforeEach(() => {
    dependencyContainer = container.createChildContainer();
  });

  it("should create all dependencies", () => {
    expect.assertions(2);

    const factory = dependencyContainer.resolve(DummyDependencyFactory);
    factory.initDependencies(dependencyContainer);

    const dummyDependency =
      dependencyContainer.resolve<DummyDependency>("Dummy");

    expect(dummyDependency.dummy()).toStrictEqual(dummyStringValue);

    const dummyDependency2 =
      dependencyContainer.resolve<DummyDependency>("Dummy");
    dummyDependency2.dummyString = "test2";

    // Test that the reference is the same (that the dependency is a singleton)
    expect(dummyDependency.dummy()).toStrictEqual(dummyDependency2.dummy());
  });
});
