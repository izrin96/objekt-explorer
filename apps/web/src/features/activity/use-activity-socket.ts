import { type ActivityMessage, activityItemSchema } from "@repo/api/schemas/activity";
import { ACTIVITY_CHANNEL } from "@repo/api/schemas/realtime";
import { useEffect, useRef } from "react";

import { acquireRealtime, realtime } from "@/lib/realtime";

/** How many recent rows the channel keeps, and so the most a new page can start from. */
const HISTORY_LIMIT = 50;
/** Rows published one per message that land within this window are one batch, as the feed highlights one. */
const BATCH_MS = 100;

/**
 * The feed's live half: the public `activity:feed` channel on the tab's one connection, with no
 * session needed. The channel's history seeds a new page, and a short drop replays what was
 * missed; rows already shown are skipped by transfer id downstream.
 *
 * `onMessage` is held in a ref: it closes over the current filters and changes on every
 * navigation, and resubscribing for that would seed the page again.
 */
export function useActivitySocket({
  enabled,
  onMessage,
}: {
  enabled: boolean;
  onMessage: (message: ActivityMessage) => void;
}): void {
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) return;
    const connection = realtime();
    const subscription =
      connection.getSubscription(ACTIVITY_CHANNEL) ?? connection.newSubscription(ACTIVITY_CHANNEL);

    // rows arrive oldest first, one per publication, and the feed draws a batch newest first
    let pending: ActivityMessage["data"] = [];
    let flush: ReturnType<typeof setTimeout> | undefined;
    subscription.on("publication", (ctx) => {
      const item = activityItemSchema.safeParse(ctx.data);
      if (!item.success) return;
      pending.push(item.data);
      flush ??= setTimeout(() => {
        const data = pending.toReversed();
        pending = [];
        flush = undefined;
        handler.current({ type: "transfer", data });
      }, BATCH_MS);
    });

    // the history is newest first, the order a batch is drawn in
    subscription.on("subscribed", (ctx) => {
      if (ctx.wasRecovering && ctx.recovered) return;
      subscription
        .history({ limit: HISTORY_LIMIT, reverse: true })
        .then(({ publications }) => {
          const data = publications.flatMap((publication) => {
            const item = activityItemSchema.safeParse(publication.data);
            return item.success ? [item.data] : [];
          });
          if (data.length > 0) handler.current({ type: "history", data });
        })
        .catch(() => undefined);
    });

    subscription.subscribe();
    const release = acquireRealtime({ signedIn: false });

    return () => {
      clearTimeout(flush);
      release();
      subscription.removeAllListeners();
      subscription.unsubscribe();
      connection.removeSubscription(subscription);
    };
  }, [enabled]);
}
