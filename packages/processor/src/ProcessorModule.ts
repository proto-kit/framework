import { ConfigurableModule } from "@proto-kit/common";

export abstract class ProcessorModule<
  Config,
> extends ConfigurableModule<Config> {
  public abstract start(): Promise<void>;
}
