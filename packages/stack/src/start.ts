import {
  Environments,
  Environment,
  startEnvironment,
} from "@proto-kit/deployment";

import { SequencerStartable } from "./scripts/graphql/run-graphql";
import { WorkerEnvironment } from "./scripts/worker";

const env = Environments.from({
  single: Environment.from({
    sequencer: new SequencerStartable(),
  }),
  distributed: WorkerEnvironment,
});

await startEnvironment(env);
