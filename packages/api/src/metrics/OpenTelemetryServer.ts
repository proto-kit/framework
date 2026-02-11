import {
  closeable,
  Closeable,
  Sequencer,
  SequencerModule,
  sequencerModule,
} from "@proto-kit/sequencer";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { inject } from "tsyringe";
import { DependencyFactory, DependencyRecord, log } from "@proto-kit/common";

import { SequencerInstrumentation } from "./SequencerInstrumentation";
import { OpenTelemetryTracer } from "./OpenTelemetryTracer";

export type OpenTelemetryServerConfig = {
  metrics?: {
    enabled?: boolean;
    prometheus?: ConstructorParameters<typeof PrometheusExporter>[0];
    nodeScrapeInterval?: number;
  };
  tracing?: {
    enabled?: boolean;
    otlp?: ConstructorParameters<typeof OTLPTraceExporter>[0];
  };
};

@sequencerModule()
@closeable()
export class OpenTelemetryServer
  extends SequencerModule<OpenTelemetryServerConfig>
  implements Closeable
{
  private sdk?: NodeSDK;

  public constructor(
    @inject("Sequencer") private readonly sequencer: Sequencer<any>
  ) {
    super();
  }

  public static dependencies() {
    return {
      Tracer: {
        useClass: OpenTelemetryTracer,
        forceOverwrite: true,
      },
    } satisfies DependencyRecord;
  }

  public async start(): Promise<void> {
    const {
      config: { metrics, tracing },
    } = this;

    // TODO Modularize Instrumentations
    const seqMetrics = this.sequencer.dependencyContainer.resolve(
      SequencerInstrumentation
    );

    const metricReader =
      metrics?.enabled ?? true
        ? new PrometheusExporter(metrics?.prometheus)
        : undefined;

    const instrumentations =
      metrics?.enabled ?? true
        ? [
            new RuntimeNodeInstrumentation({
              monitoringPrecision: metrics?.nodeScrapeInterval ?? 5000,
            }),
            seqMetrics,
          ]
        : [];

    const traceExporter =
      tracing?.enabled ?? true
        ? new OTLPTraceExporter(tracing?.otlp)
        : undefined;

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: "protokit",
        [ATTR_SERVICE_VERSION]: "canary",
      }),
      metricReader,
      traceExporter,
      instrumentations,
    });

    sdk.start();
    this.sdk = sdk;

    // TODO Write logger to directly integrate with our logging library
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

    log.info("OpenTelemetryServer started");
  }

  public async close() {
    await this.sdk?.shutdown();
  }
}

OpenTelemetryServer satisfies DependencyFactory;
