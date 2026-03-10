import { ConfigurableModule, NoConfig } from "@proto-kit/common";

export abstract class TaskWorkerModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {}
