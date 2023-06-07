import { SequencerModule } from "../sequencer/builder/SequencerModule";
import { container, inject } from "tsyringe";
import { MethodExecutionContext, MethodExecutionResult, Runtime } from "@yab/module";
import { FlipOptional } from "@yab/protocol";
import { Mempool } from "../mempool/Mempool";

interface RuntimeSequencerModuleConfig {
  proofsEnabled?: boolean;
  blocktime?: number;
}

export class BlockProducerModule extends SequencerModule<RuntimeSequencerModuleConfig> {

  public constructor(
    @inject("runtime") private readonly chain: Runtime<never>,
    @inject("mempool") private readonly mempool: Mempool
  ) {
    super();
  }

  public get defaultConfig(): FlipOptional<RuntimeSequencerModuleConfig> {
    return {
      proofsEnabled: true,
      // 5 minutes
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      blocktime: 5 * 60 * 1000,
    };
  }

  public async start(): Promise<void> {
    this.chain.setProofsEnabled(this.config.proofsEnabled);

    setInterval(() => {
      this.produceBlock();
    }, this.config.blocktime);
  }

  // Very naive impl for now
  public async produceBlock() {

    // this.mempool.getTxs().txs.map(x => {
    //   this.chain.getRuntimeModule(x.)
    // })
  }

  private executeRuntimeMethod(method: (...args: unknown[]) => unknown, ...args: unknown[]): MethodExecutionResult<unknown> {
    const executionContext = container.resolve(MethodExecutionContext);

    method(...args);

    return executionContext.current().result;
  };

  private async generateMethodTasks(method: (...args: unknown[]) => unknown, args: unknown[]){

    const result = this.executeRuntimeMethod(method, ...args)

    // result.stateTransitions

    // result.prove()

  }
}