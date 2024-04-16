import "reflect-metadata";

import { sleep } from "@proto-kit/common";

import { startServer } from "./server";

await startServer();
await sleep(100000000);
