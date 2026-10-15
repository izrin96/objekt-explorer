import { publishActivity } from "@repo/api/realtime";
import { enrichTransfers, type TransferData } from "@repo/api/services/activity-batch";
import { createSubscriber } from "@repo/lib/server/redis-subscriber";

import { log } from "../lib/log";
import { whileLeader } from "../lib/redis-lock";

const relayLog = log("activity-relay");

/**
 * Publishes each batch of the indexer's `transfers` channel to the live feed, one row per
 * publication and oldest first, so the channel's history of 50 is the newest 50 rows.
 * Only the worker holding the lock relays: a second would publish every batch again.
 */
export function relayActivity() {
  return whileLeader("worker:lock:activity-relay", { ttlMs: 30_000, label: "activity-relay" }, () =>
    subscribeActivity(),
  );
}

async function subscribeActivity() {
  const subscriber = createSubscriber(process.env.REDIS_URL, "Activity Relay");
  try {
    await subscriber.subscribe("transfers", async (message) => {
      // an async listener's rejection is unhandled and would take the process down
      try {
        const rows = await enrichTransfers(JSON.parse(message) as TransferData[]);
        await publishActivity(rows);
      } catch (error) {
        relayLog.error("Failed to relay transfers:", error);
      }
    });
  } catch (error) {
    subscriber.close();
    throw error;
  }
  return () => subscriber.close();
}
