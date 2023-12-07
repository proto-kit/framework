import { noop } from "@proto-kit/common";

import {
  SequencerModule,
  sequencerModule,
} from "../../sequencer/builder/SequencerModule";

import { BaseLayer } from "./BaseLayer";

@sequencerModule()
export class NoopBaseLayer
  extends SequencerModule
  implements BaseLayer
{
  public async blockProduced(): Promise<void> {
    noop();
  }

  public async start(): Promise<void> {
    noop();
  }
}
