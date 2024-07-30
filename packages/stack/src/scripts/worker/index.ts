import { Environment } from "@proto-kit/deployment";

import { sequencer } from "./sequencer";
import { worker } from "./worker";

const env = Environment.from({
  sequencer,
  worker,
});

export { env as WorkerEnvironment };
