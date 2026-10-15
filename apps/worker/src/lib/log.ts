const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const HOUR_MS = 60 * 60 * 1000;

/** `WORKER_LOG_LEVEL`, falling back to `info` when unset or unknown. */
export function levelFrom(value: string | undefined): Level {
  return value !== undefined && Object.hasOwn(LEVELS, value) ? (value as Level) : "info";
}

const threshold = LEVELS[levelFrom(process.env.WORKER_LOG_LEVEL)];

export type Logger = ReturnType<typeof log>;

/** Logs under one `[tag]`; `debug` lines show only with `WORKER_LOG_LEVEL=debug`. */
export function log(tag: string) {
  const prefix = `[${tag}]`;
  return {
    debug: (...args: unknown[]) => {
      if (threshold <= LEVELS.debug) console.debug(prefix, ...args);
    },
    info: (...args: unknown[]) => {
      if (threshold <= LEVELS.info) console.log(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      if (threshold <= LEVELS.warn) console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}

/** One `key value` summary of a period's counts, in the order they were first counted. */
export function summarize(counts: ReadonlyMap<string, number>) {
  return [...counts].map(([key, value]) => `${key} ${value}`).join(", ");
}

/**
 * Counts for a job that runs every few minutes, logged once an hour in place of a line per
 * run. `flush` after each run; it logs only once the hour is up.
 */
export function heartbeat(logger: Pick<Logger, "info">) {
  const counts = new Map<string, number>();
  let since = Date.now();
  return {
    count(key: string, by = 1) {
      counts.set(key, (counts.get(key) ?? 0) + by);
    },
    max(key: string, value: number) {
      counts.set(key, Math.max(counts.get(key) ?? 0, value));
    },
    flush(now = Date.now()) {
      if (now - since < HOUR_MS) return;
      logger.info(`last ${Math.round((now - since) / 60_000)} min: ${summarize(counts)}`);
      counts.clear();
      since = now;
    },
  };
}
