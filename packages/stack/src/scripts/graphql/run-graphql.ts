import "reflect-metadata";

import { sleep } from "@proto-kit/common";
import {
  Startable,
  Environments,
  Environment,
  startUpEnvironment,
} from "@proto-kit/deployment";

import { startServer } from "./server";

class SequencerStartable implements Startable {
  async start(): Promise<void> {
    await startServer();
    await sleep(100000000);
  }
}

const env = Environments.from<Startable>({
  default: Environment.from({
    sequencer: new SequencerStartable(),
  }),
});
await startUpEnvironment(env);
