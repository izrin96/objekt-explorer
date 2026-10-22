import { bumpTradeVersion } from "@repo/lib/server/list-touch";

import { redis, redisFailOpen } from "./redis";
import { MARKET_VERSION_KEY } from "./safety";

export async function marketVersion() {
  return (await redisFailOpen("market version", () => redis.get(MARKET_VERSION_KEY))) ?? "0";
}

/**
 * Drops the users' cached Trade views. Fails open: the change has committed, and a stale cache
 * expires on its own, so a Redis outage must not fail the request or skip what follows it.
 */
export async function bumpTradeVersions(userIds: string[]) {
  await redisFailOpen("trade version", () => bumpTradeVersion(redis, userIds));
}

/** After a block, sanction or revoke commits: drops the cached feeds and floors that may hold the user. */
export async function bumpSafetyVersions(userIds: string[]) {
  await redisFailOpen("safety versions", () =>
    Promise.all([redis.incr(MARKET_VERSION_KEY), bumpTradeVersion(redis, userIds)]),
  );
}
