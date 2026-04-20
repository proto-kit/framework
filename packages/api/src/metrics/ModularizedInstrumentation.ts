import { injectable, injectAll, Lifecycle, scoped } from "tsyringe";
import { PollInstrumentation, PushInstrumentation } from "@proto-kit/sequencer";
import { InstrumentationBase } from "@opentelemetry/instrumentation";
import { mapSequential, splitArray } from "@proto-kit/common";

const INSTRUMENTATION_PREFIX = "protokit";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class ModularizedInstrumentation extends InstrumentationBase<{}> {
  public constructor(
    @injectAll("Instrumentation")
    private readonly instrumentations: (
      | PushInstrumentation
      | PollInstrumentation
    )[]
  ) {
    super("protokit", "canary", {});
  }

  public async start() {
    const { pushInstrumentations } = this.splitInstrumentations();
    await mapSequential(pushInstrumentations, async (i) => await i.start());
  }

  public splitInstrumentations() {
    // PushInstrumentation is abstract, therefore we can filter like this, while Poll
    // isn't. But all remainders are of that type (bcs of the annotation) so it's fine
    const split = splitArray(this.instrumentations, (i) =>
      i instanceof PushInstrumentation ? "push" : "poll"
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const pushInstrumentations = (split.push as PushInstrumentation[]) ?? [];
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const pollInstrumentations = (split.poll as PollInstrumentation[]) ?? [];

    return {
      pushInstrumentations,
      pollInstrumentations,
    };
  }

  public initialize() {
    const { pushInstrumentations, pollInstrumentations } =
      this.splitInstrumentations();

    pollInstrumentations.forEach((instrumentation) => {
      const observableCounter = this.meter.createObservableCounter(
        `${INSTRUMENTATION_PREFIX}_${instrumentation.name}`,
        {
          description: instrumentation.description,
        }
      );

      this.meter.addBatchObservableCallback(
        async (observableResult) => {
          const metric = await instrumentation.poll();

          observableResult.observe(observableCounter, metric);
        },
        [observableCounter]
      );
    });

    pushInstrumentations.forEach((instrumentation) => {
      const gauges = instrumentation.names.map((name) => {
        const gauge = this.meter.createGauge(
          `${INSTRUMENTATION_PREFIX}_${name}`,
          {
            description: instrumentation.description,
          }
        );
        return [name, gauge] as const;
      });

      instrumentation.setPushFn((name, v) => {
        const gauge = gauges.find(([candidate]) => candidate === name);
        gauge![1].record(v);
      });
    });
  }

  // Called when a new `MeterProvider` is set
  // the Meter (result of @opentelemetry/api's getMeter) is
  // available as this.meter within this method
  // eslint-disable-next-line no-underscore-dangle
  override _updateMetricInstruments() {
    if (this.instrumentations !== undefined) {
      this.initialize();
    }
  }

  init() {}
}
