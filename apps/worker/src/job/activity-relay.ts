import { publishActivity } from "@repo/api/realtime";
import { enrichTransfers, type TransferData } from "@repo/api/services/activity-batch";
import { createSubscriber } from "@repo/lib/server/redis-subscriber";

/**
 * Publishes each batch of the indexer's `transfers` channel to the live feed, one row per
 * publication and oldest first, so the channel's history of 50 is the newest 50 rows.
 * One worker runs it: a second would publish every batch again.
 */
export async function relayActivity() {
  const subscriber = createSubscriber(process.env.REDIS_URL, "Activity Relay");
  await subscriber.subscribe("transfers", async (message) => {
    // an async listener's rejection is unhandled and would take the process down
    try {
      const rows = await enrichTransfers(JSON.parse(message) as TransferData[]);
      await publishActivity(rows);
    } catch (error) {
      console.error("[Activity Relay] Failed to relay transfers:", error);
    }
  });
  return () => subscriber.close();
}
