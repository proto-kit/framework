import { inject, injectable } from "tsyringe";

import type { PrivateMempool } from "../mempool/private/PrivateMempool";

import { instrumentation, PollInstrumentation } from "./Instrumentation";

@instrumentation()
@injectable()
export class MempoolInstrumentation implements PollInstrumentation {
  name = "mempool_size";

  description = "The size of the mempool";

  public constructor(
    @inject("Mempool")
    private readonly mempool: PrivateMempool
  ) {}

  async poll() {
    return await this.mempool.length();
  }
}
