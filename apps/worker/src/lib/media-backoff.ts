// Where the collection-media sync keeps its Cosmo backoff (Decision 10): in Valkey, so a restart,
// which runs the job at once, does not reset it; in process memory when Valkey is unreachable.

import { HOUR_MS } from "@repo/api/lib/time";

export type Backoff = { until: number; minutes: number };

/** The stored value, or null when it is missing or not `{until, minutes}` numbers. */
export function parseBackoff(raw: string | null): Backoff | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { until, minutes } = value as Record<string, unknown>;
    return typeof until === "number" && typeof minutes === "number" && Number.isFinite(until)
      ? { until, minutes }
      : null;
  } catch {
    return null;
  }
}

export type BackoffKv = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

// the record outlives `until` so the next failing run doubles it, but a long quiet spell resets it
const KEEP_AFTER_UNTIL_MS = 6 * HOUR_MS;

async function within<T>(promise: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no reply in ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The shared value wins while the store answers. A write the store missed stays in memory and is
 * pushed again on the next read, so an outage never drops a backoff the process knows about.
 */
export function createBackoffStore(
  kv: BackoffKv,
  key: string,
  { now = Date.now, timeoutMs = 3000 }: { now?: () => number; timeoutMs?: number } = {},
) {
  let memory: Backoff | null = null;
  let unsynced = false;

  async function push(value: Backoff | null) {
    try {
      if (value) {
        const ttl = Math.max(1, Math.ceil((value.until - now() + KEEP_AFTER_UNTIL_MS) / 1000));
        await within(kv.set(key, JSON.stringify(value), ttl), timeoutMs);
      } else {
        await within(kv.del(key), timeoutMs);
      }
      unsynced = false;
    } catch {
      unsynced = true;
    }
  }

  return {
    async read() {
      if (unsynced) {
        await push(memory);
        return memory;
      }
      try {
        memory = parseBackoff(await within(kv.get(key), timeoutMs));
      } catch {
        // keep the in-process copy
      }
      return memory;
    },
    async write(value: Backoff) {
      memory = value;
      await push(value);
    },
    async clear() {
      memory = null;
      await push(null);
    },
  };
}
