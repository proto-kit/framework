import { ConfigurableModule } from "../../src/config/ConfigurableModule";
import {
  errors,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
} from "../../src/config/ModuleContainer";
import { TypedClassConstructor } from "../../src/types";

class BaseTestModule<Config> extends ConfigurableModule<Config> {}

type TestModulesRecord = ModulesRecord<
  TypedClassConstructor<BaseTestModule<unknown>>
>;

interface TestModuleConfig {
  testConfigProperty: number;
}

class TestModule extends BaseTestModule<TestModuleConfig> {}

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
