import { FlipOptional } from "@yab/protocol";

import { SequencerModule } from "../../src/runtime/builder/SequencerModule";

interface DummyModuleConfig {
  password: string;
  returnvalue?: string;
}

/**
 * Dummy Module that simulates a http server through the initialization and execution of an endpoint-function
 */
export class DummySequencerModule extends SequencerModule<DummyModuleConfig> {
  private endpointFn: (password: string) => string | undefined = () => undefined;

  public get defaultConfig(): FlipOptional<DummyModuleConfig> {
    return {
      returnvalue: "DummyValue",
    };
  }

  public endpoint(password: string): string | undefined {
    return this.endpointFn(password);
  }

  public async start(): Promise<void> {
    this.endpointFn = (password: string) => (password === this.config.password ? this.config.returnvalue : undefined);
  }
}
