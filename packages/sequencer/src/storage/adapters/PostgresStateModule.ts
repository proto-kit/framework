import { NoConfig } from "@proto-kit/common";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";

@sequencerModule()
// eslint-disable-next-line import/no-unused-modules
export class PostgresStateModule extends SequencerModule<NoConfig> {
  public async start(): Promise<void> {
    return undefined;
  }
}
