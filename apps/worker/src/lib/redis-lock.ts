import { redis } from "./redis";

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end
return 0
`;
const REFRESH_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("PEXPIRE", KEYS[1], ARGV[2]) end
return 0
`;

/**
 * Runs `fn` under a Valkey lock, refreshed while it runs so a crashed holder frees it on its
 * own. Returns false without running `fn` when another holder has the lock.
 */
export async function withRedisLock(
  key: string,
  options: { ttlMs: number; refreshMs: number; label: string },
  fn: () => Promise<void>,
) {
  const token = crypto.randomUUID();
  const taken = await redis.send("SET", [key, token, "NX", "PX", String(options.ttlMs)]);
  if (taken !== "OK") return false;
  const refresh = setInterval(() => {
    redis
      .send("EVAL", [REFRESH_SCRIPT, "1", key, token, String(options.ttlMs)])
      .catch((error: unknown) => console.error(`[${options.label}] Lock refresh failed:`, error));
  }, options.refreshMs);
  try {
    await fn();
  } finally {
    clearInterval(refresh);
    await redis.send("EVAL", [RELEASE_SCRIPT, "1", key, token]);
  }
  return true;
}
