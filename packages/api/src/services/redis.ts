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

/** Values kept in process while Redis is unreachable, as JSON so no caller shares a mutable copy. */
const LOCAL_MAX_ENTRIES = 500;
const local = new Map<string, { json: string; until: number }>();

function keepLocally(key: string, json: string, ttlSeconds: number) {
  local.delete(key);
  local.set(key, { json, until: Date.now() + ttlSeconds * 1000 });
  // a Map iterates in insertion order, so the first key is the oldest
  if (local.size > LOCAL_MAX_ENTRIES) local.delete(local.keys().next().value!);
}

function readLocally(key: string): string | null {
  const entry = local.get(key);
  if (!entry) return null;
  if (entry.until > Date.now()) return entry.json;
  local.delete(key);
  return null;
}

/**
 * A cache, so a Redis outage costs only the shared hit: while Redis can't be read, values are
 * kept in this process instead, so a cached upstream call (the Cosmo API, the indexer) still runs
 * once per TTL per process rather than once per request.
 */
async function loadCache<T>(key: string, ttl: Ttl<T>, callback: () => Promise<T>): Promise<T> {
  const read = await redisTry("cache", () => redis.get(key));
  const cachedData = read.ok ? read.value : readLocally(key);

  if (cachedData) {
    try {
      return JSON.parse(cachedData) as T;
    } catch {
      // corrupted cache entry — drop it and fall through to refresh
      local.delete(key);
      await redisFailOpen("cache", () => redis.del(key));
    }
  }

  const freshData = await callback();
  const json = JSON.stringify(freshData);
  const seconds = typeof ttl === "function" ? ttl(freshData) : ttl;
  const written = await redisTry("cache", () => redis.set(key, json, "EX", seconds));
  if (!written.ok) keepLocally(key, json, seconds);
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
export function isIpRateLimited(scope: string, headers: Headers): Promise<boolean> {
  const ip = headers.get("x-real-ip") ?? "unknown";
  return rateLimitedFailOpen(scope, `${scope}:rl:${ip}`, IP_RATE_LIMIT, IP_RATE_WINDOW_SECONDS);
}

const FAIL_OPEN_TIMEOUT_MS = 250;
const TIMED_OUT = Symbol("timed out");

let connecting: Promise<void> | undefined;

/** One attempt at a time, so an outage doesn't pile up a pending promise per call. */
function connect() {
  connecting ??= redis
    .connect()
    .catch(() => undefined)
    .finally(() => {
      connecting = undefined;
    });
}

// the client connects only on its first command, and `redisTry` skips Redis until it is
// connected, so without this the first requests after a deploy would all miss the cache
connect();

type Outcome<T> = { ok: true; value: T } | { ok: false };

/**
 * `command`'s result, or `ok: false` when Redis is down, slow or failing. The client queues
 * commands while disconnected and retries forever, so an outage would hang the call rather than
 * throw: skip it when down (starting a reconnect), and give up after a short wait.
 */
async function redisTry<T>(scope: string, command: () => Promise<T>): Promise<Outcome<T>> {
  if (!redis.connected) {
    connect();
    return { ok: false };
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
      return { ok: false };
    }
    return { ok: true, value: result };
  } catch (error) {
    warnOnce(scope, `[redis] ${scope} unavailable, going without it:`, error);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** `command`'s result, or null when Redis is down, slow or failing, for a read its caller can do without. */
export async function redisFailOpen<T>(
  scope: string,
  command: () => Promise<T>,
): Promise<T | null> {
  const outcome = await redisTry(scope, command);
  return outcome.ok ? outcome.value : null;
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

/** One limit shared by every caller, failing open (`rateLimitedFailOpen`). */
export function globalRateLimited(scope: string, max: number, windowSeconds: number) {
  return rateLimitedFailOpen(scope, `${scope}:rl:global`, max, windowSeconds);
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
