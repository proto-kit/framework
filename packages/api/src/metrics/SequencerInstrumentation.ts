import { injectable } from "tsyringe";
import { BlockTriggerBase, PrivateMempool } from "@proto-kit/sequencer";
import { injectOptional } from "@proto-kit/common";
import { InstrumentationBase } from "@opentelemetry/instrumentation";

@injectable()
export class SequencerInstrumentation extends InstrumentationBase<{}> {
  private blockProduced: (height: number) => void = () => {};

  public constructor(
    @injectOptional("BlockTrigger")
    trigger: BlockTriggerBase | undefined,
    @injectOptional("Mempool")
    private readonly mempool: PrivateMempool | undefined
  ) {
    super("protokit", "canary", {});
    if (trigger !== undefined) {
      trigger.events.on("block-produced", (block) => {
        this.blockProduced(parseInt(block.height.toString(), 10));
      });
    }
  }

  // Called when a new `MeterProvider` is set
  // the Meter (result of @opentelemetry/api's getMeter) is
  // available as this.meter within this method
  // eslint-disable-next-line no-underscore-dangle
  override _updateMetricInstruments() {
    const { mempool } = this;

    if (mempool !== undefined) {
      const mempoolSize = this.meter.createObservableCounter(
        "protokit_mempool_size",
        {
          description: "The size of the mempool",
        }
      );

      this.meter.addBatchObservableCallback(
        async (observableResult) => {
          const mempoolLength = await mempool.length();

          observableResult.observe(mempoolSize, mempoolLength);
        },
        [mempoolSize]
      );
    }

    const blockHeight = this.meter.createGauge("protokit_block_height");
    this.blockProduced = (height) => blockHeight.record(height);
  }

  init() {}
}
