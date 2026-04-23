import type { Collection, Objekt, Transfer } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchKnownAddresses } from "@repo/lib/server/user";
import type { OwnedObjekt } from "@repo/lib/types/objekt";
import { serve, type ServerWebSocket } from "bun";

import { pubsub } from "./lib/pubsub";

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

void pubsub.subscribe("transfers", async (message, channel) => {
  if (channel === "transfers") {
    const transfers = JSON.parse(message) as TransferData[];

    // fetch known address
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

    // store history locally
    transferHistory.unshift(...transferBatch);
    if (transferHistory.length > MAX_HISTORY_SIZE) {
      transferHistory.length = MAX_HISTORY_SIZE;
    }

    transferBatch.reverse();

    // broadcast websocket
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
  }
});

const server = serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade endpoint
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined;
      }
      return new Response("Upgrade failed", { status: 500 });
    }

    // Health check endpoint
    if (url.pathname === "/") {
      return new Response("OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
    },
    message(ws, message) {
      const data = JSON.parse(message as string) as { type: string; data?: any };
      if (data.type === "request_history") {
        if (transferHistory.length > 0) {
          const msg = {
            type: "history",
            data: transferHistory,
          };
          ws.send(JSON.stringify(msg));
        }
      }
    },
    close(ws) {
      clients.delete(ws);
    },
  },
});

console.info(`Server is running on http://localhost:${server.port}`);

async function shutdown(signal: NodeJS.Signals) {
  console.log(`[shutdown] Received ${signal}, closing connections...`);

  // Close all WebSocket connections
  for (const client of clients) {
    client.close();
  }
  clients.clear();

  // Stop accepting new connections
  await server.stop();

  console.log("[shutdown] Server stopped");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
