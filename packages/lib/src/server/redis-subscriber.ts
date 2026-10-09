import { RedisClient } from "bun";

type Listener = RedisClient.StringPubSubListener;

/**
 * A Valkey client for subscribing that survives a dropped connection. Bun's client reconnects
 * on its own but loses its subscriptions, so each reconnect subscribes the held channels again;
 * unsubscribing first, since Bun keeps the old listener and would deliver every message twice.
 * Messages published while the connection is down are lost. Retries never stop: Bun's default
 * gives up after about 30s and never reconnects.
 */
export function createSubscriber(url: string | undefined, label: string) {
  const client = new RedisClient(url, { connectionTimeout: 5000, maxRetries: 4294967295 });
  const listeners = new Map<string, Listener>();
  let connectedOnce = false;

  client.onconnect = () => {
    if (!connectedOnce) {
      connectedOnce = true;
      return;
    }
    console.log(`[${label}] Valkey reconnected; subscribing ${listeners.size} channels again`);
    for (const [channel, listener] of listeners) {
      client
        .unsubscribe(channel)
        .then(async () => {
          // unsubscribed while this was in flight
          if (listeners.get(channel) !== listener) return;
          await client.subscribe(channel, listener);
        })
        .catch((error: unknown) =>
          console.error(`[${label}] Failed to subscribe ${channel} again:`, error),
        );
    }
  };

  return {
    async subscribe(channel: string, listener: Listener) {
      listeners.set(channel, listener);
      await client.subscribe(channel, listener);
    },
    async unsubscribe(channel: string) {
      listeners.delete(channel);
      await client.unsubscribe(channel);
    },
    close() {
      listeners.clear();
      client.close();
    },
  };
}
