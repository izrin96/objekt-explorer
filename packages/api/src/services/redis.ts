import { RedisClient } from "bun";

import { serverEnv } from "../env";
import { refuse } from "../lib/refuse";

// Bun gives up after 10 reconnect attempts (about 30s) and stays down for good; this is its maximum
export const redis = new RedisClient(serverEnv.REDIS_URL, { maxRetries: 4294967295 });

const inflight = new Map<string, Promise<unknown>>();

/** What a fresh value is kept for, in seconds; a function lets a value choose its own. */
type Ttl<T> = number | ((value: T) => number);

/** Concurrent misses for a key share one computation, so a cold entry costs one callback. */
export function getCache<T>(key: string, ttl: Ttl<T>, callback: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const pending = loadCache(key, ttl, callback).finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

/** A cache, so a Redis outage only costs the hit: the callback runs and its value is not kept. */
async function loadCache<T>(key: string, ttl: Ttl<T>, callback: () => Promise<T>): Promise<T> {
  const cachedData = await redisFailOpen("cache", () => redis.get(key));

  if (cachedData) {
    try {
      return JSON.parse(cachedData) as T;
    } catch {
      // corrupted cache entry — drop it and fall through to refresh
      await redisFailOpen("cache", () => redis.del(key));
    }
  }

  const freshData = await callback();
  await redisFailOpen("cache", () =>
    redis.set(
      key,
      JSON.stringify(freshData),
      "EX",
      typeof ttl === "function" ? ttl(freshData) : ttl,
    ),
  );
  return freshData;
}

// INCR and the expiry run as one script; a key that has no expiry, from before this ran or
// otherwise, gets one on its next hit instead of living forever
const RATE_LIMIT_SCRIPT = `
local attempts = redis.call("INCR", KEYS[1])
if redis.call("TTL", KEYS[1]) < 0 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return attempts
`;

/** Per-key fixed-window rate limit. Increments the counter, sets the window's TTL when the key has none, and returns the attempt count. */
export async function rateLimit(key: string, windowSeconds: number): Promise<number> {
  return Number(await redis.send("EVAL", [RATE_LIMIT_SCRIPT, "1", key, String(windowSeconds)]));
}

const IP_RATE_LIMIT = 30;
const IP_RATE_WINDOW_SECONDS = 60;

/**
 * A best-effort per-IP limit protecting the upstream Cosmo API. Traefik
 * overwrites x-real-ip with the peer address; any other header arrives as the
 * client wrote it.
 */
export async function isIpRateLimited(scope: string, headers: Headers): Promise<boolean> {
  const ip = headers.get("x-real-ip") ?? "unknown";
  const attempts = await rateLimit(`${scope}:rl:${ip}`, IP_RATE_WINDOW_SECONDS);
  return attempts > IP_RATE_LIMIT;
}

const FAIL_OPEN_TIMEOUT_MS = 250;
const TIMED_OUT = Symbol("timed out");

let connecting: Promise<void> | undefined;

/**
 * `command`'s result, or null when Redis is down, slow or failing, for a read whose caller can
 * do without it. The client queues commands while disconnected and retries forever, so an
 * outage would hang the call rather than throw: skip it when down, and give up after a short
 * wait. It also connects only on its first command, so a skipped call starts that connection.
 */
export async function redisFailOpen<T>(
  scope: string,
  command: () => Promise<T>,
): Promise<T | null> {
  if (!redis.connected) {
    // one attempt at a time, so an outage doesn't pile up a pending promise per call
    connecting ??= redis
      .connect()
      .catch(() => undefined)
      .finally(() => {
        connecting = undefined;
      });
    return null;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      command(),
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(resolve, FAIL_OPEN_TIMEOUT_MS, TIMED_OUT);
      }),
    ]);
    if (result === TIMED_OUT) {
      warnOnce(scope, `[redis] ${scope} timed out, going without it`);
      return null;
    }
    return result;
  } catch (error) {
    warnOnce(scope, `[redis] ${scope} unavailable, going without it:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const WARN_EVERY_MS = 60_000;
const warnedAt = new Map<string, number>();

/** One warning a minute per scope: a slow Redis would otherwise log once per list per request. */
function warnOnce(scope: string, ...message: unknown[]) {
  const now = Date.now();
  if (now - (warnedAt.get(scope) ?? 0) < WARN_EVERY_MS) return;
  warnedAt.set(scope, now);
  console.warn(...message);
}

/**
 * A fixed-window limit on `key`; counts this call, so a refused call still uses up the window.
 * Fails open when Redis is down: these limits guard against abuse, and the actions behind them
 * must not stop with it.
 */
async function rateLimitedFailOpen(scope: string, key: string, max: number, windowSeconds: number) {
  const attempts = await redisFailOpen(`rate-limit ${scope}`, () => rateLimit(key, windowSeconds));
  return attempts !== null && attempts > max;
}

/** A per-user limit, failing open (`rateLimitedFailOpen`). */
export function userRateLimited(scope: string, userId: string, max: number, windowSeconds: number) {
  return rateLimitedFailOpen(scope, `${scope}:rl:user:${userId}`, max, windowSeconds);
}

/** A per-IP limit, failing open (`rateLimitedFailOpen`); the address as `isIpRateLimited` reads it. */
export function ipRateLimited(scope: string, headers: Headers, max: number, windowSeconds: number) {
  const ip = headers.get("x-real-ip")?.trim() || "unknown";
  return rateLimitedFailOpen(scope, `${scope}:rl:ip:${ip}`, max, windowSeconds);
}

/** `userRateLimited`, refusing with the shared `user_rate_limit` code. */
export async function refuseOverUserLimit(
  scope: string,
  userId: string,
  max: number,
  windowSeconds: number,
) {
  if (await userRateLimited(scope, userId, max, windowSeconds)) {
    refuse("TOO_MANY_REQUESTS", "user_rate_limit", "Too many requests, try again shortly");
  }
}
