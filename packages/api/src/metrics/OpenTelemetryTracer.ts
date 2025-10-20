import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import { Tracer } from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";
import { noop } from "@proto-kit/common";

import type { OpenTelemetryServer } from "./OpenTelemetryServer";

@injectable()
export class OpenTelemetryTracer implements Tracer {
  public constructor(
    // We need to import this here, so that the OpenTelemetryServer will be resolved
    // before this module, and therefore will be already started when this module is
    // eventually consumed and used
    @inject("OpenTelemetryServer")
    private readonly openTelemetryServer: OpenTelemetryServer
  ) {
    noop();
  }

  private tracer: ReturnType<typeof opentelemetry.trace.getTracer> | undefined =
    undefined;

  public async trace<T>(
    name: string,
    f: () => Promise<T>,
    metadata?: Record<string, string | number>
  ) {
    if (this.openTelemetryServer.config.tracing?.enabled !== true) {
      return await f();
    }
    if (this.tracer === undefined) {
      this.tracer = opentelemetry.trace.getTracer("protokit", "canary");
    }

    return await this.tracer.startActiveSpan(name, async (span) => {
      if (metadata !== undefined) {
        span.setAttributes(metadata);
      }
      try {
        const result = await f();
        span.end();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (e) {
        if (e instanceof Error) {
          span.recordException(e);
        }
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        throw e;
      }
    });
  }
}
