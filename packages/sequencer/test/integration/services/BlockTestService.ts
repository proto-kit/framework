import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Field, PrivateKey } from "o1js";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { ArgumentTypes } from "@proto-kit/common";

import {
  AsyncStateService,
  ManualBlockTrigger,
  PrivateMempool,
} from "../../../src";
import { createTransaction } from "../utils";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockTestService {
  public constructor(
    @inject("BlockTrigger") private trigger: ManualBlockTrigger,
    @inject("Mempool") private mempool: PrivateMempool,
    @inject("Runtime") private runtime: Runtime<RuntimeModulesRecord>,
    @inject("AsyncStateService") private batchStateService: AsyncStateService,
    @inject("UnprovenStateService") private blockStateService: AsyncStateService
  ) {}

  private nonces: Record<string, number> = {};

  public async addTransaction({
    privateKey,
    method,
    args,
  }: {
    privateKey: PrivateKey;
    method: [string, string];
    args: ArgumentTypes;
  }) {
    const nonce = this.nonces[privateKey.toPublicKey().toBase58()] ?? 0;

    await this.mempool.add(
      createTransaction({
        runtime: this.runtime,
        privateKey,
        method,
        args,
        nonce,
      })
    );

    this.nonces[privateKey.toPublicKey().toBase58()] = nonce + 1;
  }

  public async getState(path: Field, type: "block" | "batch" = "block") {
    const service =
      type === "batch" ? this.batchStateService : this.blockStateService;
    return await service.get(path);
  }

  public async produceBlock() {
    return await this.trigger.produceBlock();
  }

  public async produceBatch() {
    return await this.trigger.produceBatch();
  }

  public async produceBlockAndBatch() {
    return await this.trigger.produceBlockAndBatch();
  }
}
