import { noop } from "@proto-kit/protocol";

import {
  SequencerModule,
  sequencerModule,
} from "../../sequencer/builder/SequencerModule";

import { BaseLayer } from "./BaseLayer";

@sequencerModule()
export class NoopBaseLayer
  extends SequencerModule<object>
  implements BaseLayer
{
  public async blockProduced(): Promise<void> {
    noop();
  }

  public async start(): Promise<void> {
    noop();
  }
}
