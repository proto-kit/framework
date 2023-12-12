import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";

@sequencerModule()
// eslint-disable-next-line import/no-unused-modules
export class PostgresStateModule extends SequencerModule {
  public async start(): Promise<void> {
    return undefined;
  }
}
