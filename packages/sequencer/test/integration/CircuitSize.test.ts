import { InMemoryStateService, Runtime } from "@proto-kit/module";
import {
  BlockProducerModule, LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer, TaskQueue
} from "../../src";
import { log } from "@proto-kit/common";
import { Balance } from "./mocks/Balance";
import { AppChain } from "@proto-kit/sdk";
import { StateTransitionProverPublicInput, VanillaProtocol } from "@proto-kit/protocol";
import { Circuit, Provable } from "snarkyjs";

describe("circuit size", () => {
  let runtime: Runtime<{ Balance: typeof Balance }>;
  let app: AppChain<any, any, any, any>;

  beforeEach(async () => {
    // container.reset();

    log.setLevel("TRACE");

    runtime = Runtime.from({
      modules: {
        Balance,
      },

      config: {
        Balance: {},
      },

      state: new InMemoryStateService(),
    });

    const sequencer = Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        BlockTrigger: ManualBlockTrigger,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
      },
    });

    sequencer.dependencyContainer.register<TaskQueue>("TaskQueue", {
      useValue: new LocalTaskQueue(0),
    });

    app = AppChain.from({
      runtime,
      sequencer,
      protocol: VanillaProtocol.create(),
      modules: {},
    });

    // Start AppChain
    await app.start();
  });

  it("print out constraint sizes for all circuits", async () => {
  })
})