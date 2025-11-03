// TODO: ressurrect during lightnet integration
// import {
//   Environments,
//   Environment,
//   startEnvironment,
// } from "@proto-kit/deployment";
//
// import { SequencerStartable } from "./scripts/graphql/run-graphql";
// import { WorkerEnvironment } from "./scripts/worker";
//
// const env = Environments.from({
//   single: Environment.from({
//     sequencer: new SequencerStartable(),
//   }),
//   distributed: WorkerEnvironment,
// });
//
// await startEnvironment(env);

import { sleep } from "@proto-kit/common";

import { startServer } from "./scripts/graphql/server";

await startServer();
await sleep(1000);
