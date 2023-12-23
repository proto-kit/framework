/* eslint-disable max-classes-per-file */
import "reflect-metadata";
import { container as tsyringeContainer } from "tsyringe";

import { ConfigurableModule } from "../../src/config/ConfigurableModule";
import {
  ModuleContainerErrors,
  ModuleContainer,
  ModulesRecord, DependenciesFromModules, MergeObjects, ResolvableModules
} from "../../src/config/ModuleContainer";
import { TypedClass } from "../../src/types";
import { DependencyFactory2 } from "../../src";

// module container will accept modules that extend this type
class BaseTestModule<Config> extends ConfigurableModule<Config> {}

type TestModulesRecord = ModulesRecord<TypedClass<BaseTestModule<unknown>>>;

interface TestModuleConfig {
  testConfigProperty: number;
  testConfigProperty2?: number;
  testConfigProperty3?: number;
}

class TestModule extends BaseTestModule<TestModuleConfig> implements DependencyFactory2 {
  public dependencies() {
    return {
      dependencyModule1: {
        type: OtherTestModule
      }
    };
  }
}

interface OtherTestModuleConfig {
  otherTestConfigProperty: number;
}

class OtherTestModule extends BaseTestModule<OtherTestModuleConfig> {
  x() {
    return ""
  }
}

/**
 * Showcases a wrongly typed/defined module as
 * per the TestModuleContainer requirements
 */
// eslint-disable-next-line max-len
// eslint-disable-next-line @typescript-eslint/no-extraneous-class, @typescript-eslint/no-unused-vars
class WrongTestModule {}

class TestModuleContainer<
  Modules extends TestModulesRecord
> extends ModuleContainer<Modules> {}

type inferred = DependenciesFromModules<{
  TestModule: typeof TestModule;
  OtherTestModule: typeof OtherTestModule;
}>;

// const merged2T: merged2 = {
//   dependencyModule1: ""
// }

describe("moduleContainer", () => {
  let container: TestModuleContainer<{
    TestModule: typeof TestModule;
    OtherTestModule: typeof OtherTestModule;
  }>;
  const testConfigProperty = 0;

  beforeEach(() => {
    container = new TestModuleContainer({
      modules: {
        TestModule,
        OtherTestModule,
        // this module would not be assignable to TestModuleContainer
        // WrongTestModule,
      },
    });
  });

  it("should throw on resolution, if config was not provided", () => {
    expect.assertions(1);

    container.create(() => tsyringeContainer.createChildContainer());

    expect(() => {
      container.resolve("TestModule");
    }).toThrow();
  });

  it("should resolve the registered module with the provided config", () => {
    expect.assertions(1);

    container.configure({
      TestModule: {
        testConfigProperty,
      },

      OtherTestModule: {
        otherTestConfigProperty: testConfigProperty,
      },
    });
    container.create(() => tsyringeContainer.createChildContainer());

    const testModule = container.resolve("TestModule");

    expect(testModule.config.testConfigProperty).toBe(testConfigProperty);

    const dependency = container.resolve("dependencyModule1");
    dependency.x();
  });

  it("should stack configurations correctly", () => {
    container.configure({
      TestModule: {
        testConfigProperty: 1,
      },
      OtherTestModule: {
        otherTestConfigProperty: 4,
      },
    });

    container.configurePartial({
      TestModule: {
        testConfigProperty2: 2,
      },
    });

    container.configurePartial({
      TestModule: {
        testConfigProperty: 3,
      },
    });

    container.create(() => tsyringeContainer.createChildContainer());

    const config = container.resolve("TestModule").config;

    expect(config.testConfigProperty).toBe(3);
    expect(config.testConfigProperty2).toBe(2);
    expect(config.testConfigProperty3).toBe(undefined);
  });
});
