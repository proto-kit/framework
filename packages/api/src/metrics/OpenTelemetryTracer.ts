import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import { Tracer } from "@proto-kit/sequencer";

export class OpenTelemetryTracer implements Tracer {
  private tracer: ReturnType<typeof opentelemetry.trace.getTracer> | undefined =
    undefined;

  public async trace<T>(
    name: string,
    f: () => Promise<T>,
    metadata?: Record<string, string | number>
  ) {
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
