import type { Collection, Objekt, Transfer } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchKnownAddresses } from "@repo/lib/server/user";
import type { OwnedObjekt } from "@repo/lib/types/objekt";
import { RedisClient, type ServerWebSocket } from "bun";

import { serverEnv } from "./env";

const pubsub = new RedisClient(serverEnv.REDIS_URL, {
  connectionTimeout: 5000,
});

const clients = new Set<ServerWebSocket>();

const transferHistory: TransferSendData[] = [];
const MAX_HISTORY_SIZE = 50;

type TransferData = Transfer & {
  collection: Collection;
  objekt: Objekt;
};

type TransferSendData = {
  nickname: {
    from: string | undefined;
    to: string | undefined;
  };
  transfer: Transfer;
  objekt: OwnedObjekt;
};

export async function startActivityWebSocket(): Promise<void> {
  try {
    await pubsub.subscribe("transfers", async (message, channel) => {
      if (channel !== "transfers") return;
      // an async listener's rejection is unhandled and would take the process down
      try {
        const transfers = JSON.parse(message) as TransferData[];

        const addresses = transfers.flatMap((a) => [a.from, a.to]);
        const knownAddresses = await fetchKnownAddresses(addresses);

        const addressMap = new Map(knownAddresses.map((a) => [a.address.toLowerCase(), a]));

        const transferBatch: TransferSendData[] = [];

        for (const transfer of transfers) {
          if (transfer.collection.slug === "empty-collection") continue;

          const { objekt, collection, ...rest } = transfer;
          const fromUser = addressMap.get(transfer.from.toLowerCase());
          const toUser = addressMap.get(transfer.to.toLowerCase());

          const transferEvent = {
            nickname: {
              from: fromUser?.hideNickname ? undefined : (fromUser?.nickname ?? undefined),
              to: toUser?.hideNickname ? undefined : (toUser?.nickname ?? undefined),
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
              }),
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
  open(ws: ServerWebSocket) {
    clients.add(ws);
  },
  message(ws: ServerWebSocket, message: string | Buffer) {
    let data: unknown;
    try {
      data = JSON.parse(message as string);
    } catch {
      return; // ignore malformed frames
    }
    // `null` parses fine, and reading `.type` off it would throw out of the handler
    if (typeof data !== "object" || data === null) return;
    if ((data as { type?: unknown }).type === "request_history") {
      if (transferHistory.length > 0) {
        ws.send(JSON.stringify({ type: "history", data: transferHistory }));
      }
    }
  },
  close(ws: ServerWebSocket) {
    clients.delete(ws);
  },
};

export function closeWebSocketConnections(): void {
  for (const client of clients) {
    client.close();
  }
  clients.clear();
}
