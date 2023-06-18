import { Presets } from "@yab/common";

import {
  sequencerModule,
  SequencerModule,
} from "../../../src/sequencer/builder/SequencerModule";

interface DummyConfig {
  password: string;
  returnValue: string;
}

@sequencerModule()
export class DummyModule extends SequencerModule<DummyConfig> {
  public static presets = {} satisfies Presets<DummyConfig>;

  private readonly handlerFn: (password: string) => string | undefined = () =>
    undefined;

  public call(password: string): string | undefined {
    return this.handlerFn(password);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async start(): Promise<void> {}
}
