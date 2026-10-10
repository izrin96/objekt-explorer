import { bumpTradeVersion } from "@repo/lib/server/list-touch";

import { redis } from "./redis";
import { MARKET_VERSION_KEY } from "./safety";

export async function marketVersion() {
  return (await redis.get(MARKET_VERSION_KEY)) ?? "0";
}

/** After a block, sanction or revoke commits: drops the cached feeds and floors that may hold the user. */
export async function bumpSafetyVersions(userIds: string[]) {
  await Promise.all([redis.incr(MARKET_VERSION_KEY), bumpTradeVersion(redis, userIds)]);
}
