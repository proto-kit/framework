import { inject, injectable } from "tsyringe";
import { BlockStorage } from "@proto-kit/sequencer";
import humanizeDuration from "humanize-duration";

export interface NodeStatus {
  uptime: number;
  uptimeHumanReadable: string;
  height: number;
}

@injectable()
export class NodeStatusService {
  private readonly startupTime = Date.now();

  public constructor(
    @inject("BlockStorage") private readonly blockStorage: BlockStorage
  ) {
  }

  public async getNodeStatus(): Promise<NodeStatus> {
    const uptime = Date.now() - this.startupTime;
    const uptimeHumanReadable = humanizeDuration(uptime);
    const height = await this.blockStorage.getCurrentBlockHeight();

    return {
      uptime,
      uptimeHumanReadable,
      height,
    };
  }
}
