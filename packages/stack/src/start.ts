import {
  Environments,
  Environment,
  startupEnvironment,
} from "@proto-kit/deployment";

import { SequencerStartable } from "./scripts/graphql/run-graphql";
import { WorkerEnvironment } from "./scripts/worker";

const env = Environments.from({
  single: Environment.from({
    sequencer: new SequencerStartable(),
  }),
  distributed: WorkerEnvironment,
});

await startupEnvironment(env);
