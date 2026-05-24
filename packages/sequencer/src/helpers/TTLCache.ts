import { log } from "@proto-kit/common";

export type TtlCacheOptions<T> = {
  ttlMs: number;
  load: () => Promise<T | undefined>;
  label?: string;
};

/**
 * Simple TTL cache:
 * - returns cached values if fresh
 * - refreshes on demand when stale (awaited)
 * - de-dupes concurrent refreshes
 */
export class TtlCache<T> {
  private value?: T;

  private fetchedAtMs?: number;

  private inFlight?: Promise<T | undefined>;

  public constructor(private readonly options: TtlCacheOptions<T>) {}

  public getCached(): T | undefined {
    return this.value;
  }

  public async get(nowMs: number = Date.now()): Promise<T | undefined> {
    if (!this.isStale(nowMs)) {
      return this.value;
    }

    if (this.inFlight !== undefined) {
      return await this.inFlight;
    }

    const { load, label } = this.options;
    this.inFlight = (async () => {
      try {
        const next = await load();
        if (next !== undefined) {
          this.value = next;
          this.fetchedAtMs = Date.now();
        }
        return this.value;
      } catch (err) {
        log.warn(`${label ?? "TtlCache"}: refresh failed (${String(err)})`);
        return this.value;
      } finally {
        this.inFlight = undefined;
      }
    })();

    return await this.inFlight;
  }

  private isStale(nowMs: number): boolean {
    const { ttlMs } = this.options;
    if (this.fetchedAtMs === undefined) return true;
    return nowMs - this.fetchedAtMs >= ttlMs;
  }
}
