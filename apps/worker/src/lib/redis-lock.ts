import { log } from "./log";
import { redis } from "./redis";

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end
return 0
`;
const REFRESH_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("PEXPIRE", KEYS[1], ARGV[2]) end
return 0
`;

// a Valkey call slower than this is treated as failed, so a stalled connection can't hang a job
const CALL_MS = 5000;

const lockLog = log("lock");

/** Locks this process holds, so a shutdown can free them instead of leaving them to expire. */
const held = new Map<string, string>();
let closing = false;

/** Rejects once `ms` pass without `promise` settling. */
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

async function take(key: string, token: string, ttlMs: number) {
  if (closing) return false;
  const reply = await within(redis.send("SET", [key, token, "NX", "PX", String(ttlMs)]), CALL_MS);
  if (reply !== "OK") return false;
  held.set(key, token);
  return true;
}

async function refresh(key: string, token: string, ttlMs: number) {
  const reply = await within(
    redis.send("EVAL", [REFRESH_SCRIPT, "1", key, token, String(ttlMs)]),
    CALL_MS,
  );
  return Number(reply) === 1;
}

async function release(key: string, token: string) {
  if (held.get(key) === token) held.delete(key);
  try {
    await within(redis.send("EVAL", [RELEASE_SCRIPT, "1", key, token]), CALL_MS);
  } catch (error) {
    lockLog.warn(`Could not release ${key}; it expires on its own:`, error);
  }
}

/**
 * Runs `fn` under a Valkey lock, refreshed while it runs so a crashed holder frees it on its
 * own. Returns false without running `fn` when another holder has the lock.
 */
export async function withRedisLock(
  key: string,
  options: { ttlMs: number; refreshMs: number; label: string },
  fn: () => Promise<void>,
) {
  const logger = log(options.label);
  const token = crypto.randomUUID();
  if (!(await take(key, token, options.ttlMs))) return false;
  const timer = setInterval(() => {
    void refresh(key, token, options.ttlMs)
      .then((kept) => {
        if (!kept) logger.warn(`Lost ${key}; another run may start alongside this one`);
      })
      .catch((error: unknown) => logger.error("Lock refresh failed:", error));
  }, options.refreshMs);
  try {
    await fn();
  } finally {
    clearInterval(timer);
    await release(key, token);
  }
  return true;
}

/**
 * Keeps one worker running `start` across replicas: every worker keeps trying to take `key`,
 * the holder runs what `start` began, and stops it once two thirds of `ttlMs` pass since its
 * last refresh was sent, before the lock can expire and another worker take over. Returns a
 * stop function.
 */
export async function whileLeader(
  key: string,
  options: { ttlMs: number; label: string },
  start: () => Promise<() => void>,
) {
  const logger = log(options.label);
  const token = crypto.randomUUID();
  const tickMs = Math.floor(options.ttlMs / 3);
  let stopLeading: (() => void) | null = null;
  // when the last refresh that kept the lock was sent: the lock lasts `ttlMs` from then at most
  let keptSince = 0;
  let busy = false;
  let stopped = false;
  let startFailing = false;

  const stepDown = (reason: string) => {
    stopLeading?.();
    stopLeading = null;
    if (held.get(key) === token) held.delete(key);
    logger.warn(reason);
  };
  const overdue = () => stopLeading !== null && Date.now() - keptSince >= tickMs * 2;

  const lead = async () => {
    const sentAt = Date.now();
    if (!(await take(key, token, options.ttlMs))) return;
    const starting = start();
    try {
      stopLeading = await within(starting, tickMs);
    } catch (error) {
      // a start that finishes after the timeout is stopped at once
      void starting.then(
        (stop) => stop(),
        () => {},
      );
      await release(key, token);
      if (!startFailing) logger.error("Could not start; retrying until it does:", error);
      startFailing = true;
      return;
    }
    keptSince = sentAt;
    if (stopped) {
      stopLeading();
      stopLeading = null;
      await release(key, token);
      return;
    }
    startFailing = false;
    logger.info("Took the lock; running here");
  };

  const tick = async () => {
    if (busy || stopped) return;
    if (overdue()) stepDown("Could not refresh the lock in time; stopped here");
    busy = true;
    try {
      if (stopLeading === null) {
        await lead();
      } else {
        const sentAt = Date.now();
        if (await refresh(key, token, options.ttlMs)) keptSince = sentAt;
        else stepDown("Lost the lock; stopped here");
      }
    } catch (error) {
      logger.error("Lock check failed:", error);
    } finally {
      busy = false;
      if (overdue()) stepDown("Could not refresh the lock in time; stopped here");
    }
  };

  await tick();
  const timer = setInterval(() => void tick(), tickMs);
  return async () => {
    stopped = true;
    clearInterval(timer);
    if (stopLeading !== null) {
      stopLeading();
      stopLeading = null;
      await release(key, token);
    }
  };
}

/** Frees every lock this process holds and takes no more, for a shutdown. */
export async function releaseHeldLocks() {
  closing = true;
  await Promise.all([...held].map(([key, token]) => release(key, token)));
}
