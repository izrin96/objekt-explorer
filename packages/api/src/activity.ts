import { createSubscriber } from "@repo/lib/server/redis-subscriber";
import type { ServerWebSocket } from "bun";

import { serverEnv } from "./env";
import {
  type ActivityItem,
  type ActivityMessage,
  activityClientMessageSchema,
} from "./schemas/activity";
import { enrichTransfers, type TransferData } from "./services/activity-batch";

const pubsub = createSubscriber(serverEnv.REDIS_URL, "ActivityWS");

const clients = new Set<ServerWebSocket<unknown>>();

const transferHistory: ActivityItem[] = [];
const MAX_HISTORY_SIZE = 50;

export async function startActivityWebSocket(): Promise<void> {
  try {
    await pubsub.subscribe("transfers", async (message, channel) => {
      if (channel !== "transfers") return;
      // an async listener's rejection is unhandled and would take the process down
      try {
        const transfers = JSON.parse(message) as TransferData[];

        const transferBatch = await enrichTransfers(transfers);

        transferHistory.unshift(...transferBatch);
        if (transferHistory.length > MAX_HISTORY_SIZE) {
          transferHistory.length = MAX_HISTORY_SIZE;
        }

        transferBatch.reverse();

        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "transfer",
                data: transferBatch,
              } satisfies ActivityMessage),
            );
          }
        });
      } catch (error) {
        console.error(
          "[ActivityWS] Failed to relay transfers:",
          error instanceof Error ? error.message : String(error),
        );
      }
    });
    console.log("[ActivityWS] Subscribed to transfers channel");
  } catch (error) {
    console.error(
      "[ActivityWS] Failed to subscribe to transfers channel:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export const websocketHandlers = {
  open(ws: ServerWebSocket<unknown>) {
    clients.add(ws);
  },
  message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
    let data: unknown;
    try {
      data = JSON.parse(message as string);
    } catch {
      return; // ignore malformed frames
    }
    if (!activityClientMessageSchema.safeParse(data).success) return;
    if (transferHistory.length > 0) {
      ws.send(JSON.stringify({ type: "history", data: transferHistory } satisfies ActivityMessage));
    }
  },
  close(ws: ServerWebSocket<unknown>) {
    clients.delete(ws);
  },
};

export function closeWebSocketConnections(): void {
  for (const client of clients) {
    client.close();
  }
  clients.clear();
}
