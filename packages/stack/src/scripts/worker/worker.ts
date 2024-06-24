import { AppChain } from "@proto-kit/sdk";
import { Sequencer } from "@proto-kit/sequencer";
import { SimpleSequencerModules } from "@proto-kit/library";
import { BullQueue } from "@proto-kit/deployment";

import { app } from "./app";

export const worker = AppChain.from({
  Runtime: app.Runtime,
  Protocol: app.Protocol,
  Sequencer: Sequencer.from({
    modules: SimpleSequencerModules.worker(BullQueue, {}),
  }),
  modules: {},
});

worker.configurePartial({
  Runtime: app.config.runtime,
  Protocol: app.config.protocol,
  Sequencer: {
    ...SimpleSequencerModules.defaultWorkerConfig(),
    TaskQueue: {
      redis: {
        host: "protokit-redis",
        port: 6379,
        password: "password",
      },
    },
  },
});
