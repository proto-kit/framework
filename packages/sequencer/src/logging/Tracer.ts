export interface Tracer {
  trace<T>(
    name: string,
    f: () => Promise<T>,
    metadata?: Record<string, string | number | boolean>
  ): Promise<T>;
}
