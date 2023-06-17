/* eslint-disable max-classes-per-file */
import { ConfigurableModule } from "../../src/config/ConfigurableModule";
import {
  errors,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
} from "../../src/config/ModuleContainer";
import { TypedClassConstructor } from "../../src/types";

// module container will accept modules that extend this type
class BaseTestModule<Config> extends ConfigurableModule<Config> {}

type TestModulesRecord = ModulesRecord<
  TypedClassConstructor<BaseTestModule<unknown>>
>;

interface TestModuleConfig {
  testConfigProperty: number;
}

class TestModule extends BaseTestModule<TestModuleConfig> {}

/**
 * Showcases a wrongly typed/defined module as
 * per the TestModuleContainer requirements
 */
// eslint-disable-next-line max-len
// eslint-disable-next-line @typescript-eslint/no-extraneous-class, @typescript-eslint/no-unused-vars
class WrongTestModule {}

class TestModuleContainer<
  Modules extends TestModulesRecord = TestModulesRecord,
  Config extends ModulesConfig<Modules> = ModulesConfig<Modules>
> extends ModuleContainer<Modules, Config> {}

describe("moduleContainer", () => {
  let container: TestModuleContainer<{
    TestModule: typeof TestModule;
  }>;
  const testConfigProperty = 0;

  beforeEach(() => {
    container = new TestModuleContainer({
      modules: {
        TestModule,
        // this module would not be assignable to TestModuleContainer
        // WrongTestModule,
      },
    });
  });

  it("should throw on resolution, if config was not provided", () => {
    expect.assertions(1);

    expect(() => {
      container.resolve("TestModule");
    }).toThrow(errors.configNotSetInContainer("TestModule"));
  });

  it("should resolve the registred module with the provided config", () => {
    expect.assertions(1);

    container.configure({
      TestModule: {
        testConfigProperty,
      },
    });

    const testModule = container.resolve("TestModule");

    expect(testModule.config.testConfigProperty).toBe(testConfigProperty);
  });
});
