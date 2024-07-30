import "reflect-metadata";

import { sleep } from "@proto-kit/common";
import { Startable } from "@proto-kit/deployment";

import { startServer } from "./server";

export class SequencerStartable implements Startable {
  async start(): Promise<void> {
    await startServer();
    await sleep(100000000);
  }
}
