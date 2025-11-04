import "reflect-metadata";
import { DependencyFactory, noop, sleep } from "@proto-kit/common";
import { jest } from "@jest/globals";
import { container } from "tsyringe";

import {
  Closeable,
  closeable,
  Sequencer,
  sequencerModule,
  SequencerModule,
} from "../../../src";

describe("Sequencer close", () => {
  it("should close all services", async () => {
    const spyFn = jest.fn<() => void>();

    @closeable()
    @sequencerModule()
    class CloseableModule extends SequencerModule implements Closeable {
      public async start(): Promise<void> {
        noop();
      }

      public async close() {
        await sleep(200);
        spyFn.call(undefined);
      }
    }

    @sequencerModule()
    class DependencyFactoryModule
      extends SequencerModule
      implements DependencyFactory
    {
      public async start(): Promise<void> {
        noop();
      }

      dependencies() {
        return {
          Dep2: {
            useClass: CloseableModule,
          },
        };
      }
    }

    const sequencer = new (Sequencer.from({
      Foo: CloseableModule,
      Bar: CloseableModule,
      D: DependencyFactoryModule,
    }))();
    sequencer.create(() => container.createChildContainer());
    sequencer.configure({
      Foo: {},
      Bar: {},
      D: {},
    });

    sequencer.resolve("D");

    await sequencer.close();

    expect(spyFn).toHaveBeenCalledTimes(3);
  });
});
