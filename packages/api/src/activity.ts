import type { Collection, Objekt, Transfer } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchPublicNicknames } from "@repo/lib/server/user";
import { RedisClient, type ServerWebSocket } from "bun";

import { serverEnv } from "./env";
import {
  type ActivityItem,
  type ActivityMessage,
  activityClientMessageSchema,
} from "./schemas/activity";

const pubsub = new RedisClient(serverEnv.REDIS_URL, {
  connectionTimeout: 5000,
});

const clients = new Set<ServerWebSocket<unknown>>();

const transferHistory: ActivityItem[] = [];
const MAX_HISTORY_SIZE = 50;

type TransferData = Transfer & {
  collection: Collection;
  objekt: Objekt;
};

export async function startActivityWebSocket(): Promise<void> {
  try {
    await pubsub.subscribe("transfers", async (message, channel) => {
      if (channel !== "transfers") return;
      // an async listener's rejection is unhandled and would take the process down
      try {
        const transfers = JSON.parse(message) as TransferData[];

        const nicknameOf = await fetchPublicNicknames(transfers.flatMap((a) => [a.from, a.to]));

        const transferBatch: ActivityItem[] = [];

        for (const transfer of transfers) {
          if (transfer.collection.slug === "empty-collection") continue;

          const { objekt, collection, ...rest } = transfer;
          const transferEvent = {
            nickname: {
              from: nicknameOf(transfer.from),
              to: nicknameOf(transfer.to),
            },
            transfer: rest,
            objekt: mapOwnedObjekt(objekt, collection),
          };

          transferBatch.push(transferEvent);
        }

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
