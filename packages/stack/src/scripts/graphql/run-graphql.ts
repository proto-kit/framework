#!/usr/bin/env ts-node
import "reflect-metadata";

import { sleep, Startable } from "@proto-kit/common";

import { startServer } from "./server";

export class SequencerStartable implements Startable {
  async start(): Promise<void> {
    await startServer();
    await sleep(100000000);
  }
}

await startServer();
