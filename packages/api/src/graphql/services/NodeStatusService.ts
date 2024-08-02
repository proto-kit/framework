import * as process from "node:process";

import { inject, injectable } from "tsyringe";
import {
  BatchStorage,
  BlockStorage,
  SettlementStorage,
} from "@proto-kit/sequencer";
import humanizeDuration from "humanize-duration";

export interface ProcessInformation {
  uptime: number;
  uptimeHumanReadable: string;
  headUsed: number;
  headTotal: number;
  nodeVersion: string;
  arch: string;
  platform: string;
}

export interface NodeInformation {
  blockHeight: number;
  batchHeight: number;
}

@injectable()
export class NodeStatusService {
  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage,
    @inject("BatchStorage") private readonly batchStorage: BatchStorage,
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage
  ) {}

  public getProcessInfo(): ProcessInformation {
    const uptime = Math.floor(process.uptime() * 1000);
    const uptimeHumanReadable = humanizeDuration(uptime);

    const memory = process.memoryUsage();
    const nodeVersion = process.version;
    const { arch } = process;
    const { platform } = process;

    return {
      uptime,
      uptimeHumanReadable,
      headTotal: memory.heapTotal,
      headUsed: memory.heapUsed,
      nodeVersion,
      arch,
      platform,
    };
  }

  public async getNodeInformation(): Promise<NodeInformation> {
    const blockHeight = await this.blockStorage.getCurrentBlockHeight();
    const batchHeight = await this.batchStorage.getCurrentBatchHeight();

    return {
      blockHeight,
      batchHeight,
    };
  }
}
