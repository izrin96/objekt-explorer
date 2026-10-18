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

async function loadCache<T>(key: string, ttl: Ttl<T>, callback: () => Promise<T>): Promise<T> {
  const cachedData = await redis.get(key);

  if (cachedData) {
    try {
      return JSON.parse(cachedData) as T;
    } catch {
      // corrupted cache entry — drop it and fall through to refresh
      await redis.del(key);
    }
  }

  const freshData = await callback();
  await redis.set(
    key,
    JSON.stringify(freshData),
    "EX",
    typeof ttl === "function" ? ttl(freshData) : ttl,
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

const USER_LIMIT_TIMEOUT_MS = 250;

/**
 * A per-user fixed-window limit; counts this call, so a refused call still uses up the window.
 * Fails open when Redis is down: these limits guard against abuse, and the safe actions behind
 * them (a block, a picker read) must not stop with it.
 */
export async function userRateLimited(
  scope: string,
  userId: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  // the client queues commands while disconnected and retries forever, so an outage would
  // hang the call rather than throw: skip it when down, and give up after a short wait
  if (!redis.connected) return false;
  try {
    const attempts = await Promise.race([
      rateLimit(`${scope}:rl:user:${userId}`, windowSeconds),
      new Promise<null>((resolve) => setTimeout(resolve, USER_LIMIT_TIMEOUT_MS, null)),
    ]);
    if (attempts === null) {
      console.warn(`[rate-limit] ${scope} timed out, letting the call through`);
      return false;
    }
    return attempts > max;
  } catch (error) {
    console.warn(`[rate-limit] ${scope} unavailable, letting the call through:`, error);
    return false;
  }
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
