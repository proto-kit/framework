/* eslint-disable jest/no-restricted-matchers */
import "reflect-metadata";
import { container } from "tsyringe";

import { Sequencer } from "../../src/sequencer/executor/Sequencer";

import { DummyModule, DummyModuleParent, DummyModuleWithoutDecorator } from "./DummyModule";

describe("sequencer", () => {
  it("should inject module and start correctly", async () => {
    expect.assertions(7);

    const password = "password123";
    const returnValue = "custom return";
    const childContainer = container.createChildContainer();

    const sequencer = Sequencer.from({
      dummy: DummyModule,
    })(childContainer);

    sequencer.configure({
      dummy: {
        password,
        returnValue,
      },
    });

    await sequencer.start();

    expect(childContainer.isRegistered("dummy")).toBeTruthy();

    const resolvedDummyModule = childContainer.resolve<DummyModule>("dummy");

    expect(resolvedDummyModule).toBeDefined();

    const { config } = resolvedDummyModule;

    expect(config).toBeDefined();
    expect(config.password).toStrictEqual(password);
    expect(config.returnValue).toStrictEqual(returnValue);

    expect(resolvedDummyModule.call(password)).toStrictEqual(returnValue);
    expect(resolvedDummyModule.call("wrong pw")).toBeUndefined();
  });

  it("should correctly resolve depending modules, should use default config values", async () => {
    expect.assertions(3);

    const password = "password123";
    const childContainer = container.createChildContainer();

    const sequencer = Sequencer.from({
      dummy: DummyModule,
      parent: DummyModuleParent,
    })(childContainer);

    sequencer.configure({
      dummy: {
        password,
      },

      parent: {
        passwordForChild: password,
      },
    });

    await sequencer.start();

    const resolvedParent = childContainer.resolve<DummyModuleParent>("parent");

    expect(resolvedParent).toBeDefined();
    expect(resolvedParent.dummychild).toBeDefined();

    const resolvedChild = childContainer.resolve<DummyModule>("dummy");

    expect(resolvedParent.callChild()).toStrictEqual(resolvedChild.defaultConfig.returnValue);
  });

  it("should throw on un-decorated module", () => {
    expect.assertions(1);

    function sequencerInit() {
      return Sequencer.from({
        dummy: DummyModuleWithoutDecorator,
      });
    }

    expect(sequencerInit()).toThrow(
      "Unable to register module: dummy / DummyModuleWithoutDecorator, did you forget to add @sequencerModule()?"
    );
  });
});
