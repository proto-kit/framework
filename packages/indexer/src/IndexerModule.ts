import { ConfigurableModule } from "@proto-kit/common";

export abstract class IndexerModule<Config> extends ConfigurableModule<Config> {
  public abstract start(): Promise<void>;
}
