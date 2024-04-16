import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";

@sequencerModule()
export class PostgresStateModule extends SequencerModule {
  public async start(): Promise<void> {
    return undefined;
  }
}
