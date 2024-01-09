import { inject, injectable } from "tsyringe";
import { BlockStorage, UnprovenBlockStorage } from "@proto-kit/sequencer";
import humanizeDuration from "humanize-duration";

export interface NodeStatus {
  uptime: number;
  uptimeHumanReadable: string;
  height: number;
  settlements: number;
}

@injectable()
export class NodeStatusService {
  private readonly startupTime = Date.now();

  public constructor(
    @inject("UnprovenBlockStorage")
    private readonly unprovenBlockStorage: UnprovenBlockStorage,
    @inject("BlockStorage") private readonly blockStorage: BlockStorage
  ) {}

  public async getNodeStatus(): Promise<NodeStatus> {
    const uptime = Date.now() - this.startupTime;
    const uptimeHumanReadable = humanizeDuration(uptime);
    const height = await this.unprovenBlockStorage.getCurrentBlockHeight();
    const settlements = await this.blockStorage.getCurrentBlockHeight();

    return {
      uptime,
      uptimeHumanReadable,
      height,
      settlements,
    };
  }
}
