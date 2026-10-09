import { createSubscriber } from "@repo/lib/server/redis-subscriber";

import { redis } from "../lib/redis";

/**
 * Republishes the indexer's `transfers` channel from another Valkey (production's) onto this
 * worker's own, for a staging stack that shares the production indexer but not its Valkey.
 */
export async function relayTransfers(sourceUrl: string) {
  // relaying a Valkey onto itself would republish every message forever
  if (sourceUrl === process.env.REDIS_URL) {
    throw new Error("TRANSFERS_RELAY_FROM is this worker's own REDIS_URL");
  }
  const subscriber = createSubscriber(sourceUrl, "Transfers Relay");
  await subscriber.subscribe("transfers", (message) => {
    redis
      .publish("transfers", message)
      .catch((error: unknown) => console.error("[Transfers Relay] Failed to publish:", error));
  });
  return () => subscriber.close();
}
