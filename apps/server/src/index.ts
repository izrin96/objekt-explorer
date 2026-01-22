import type { Collection, Objekt, Transfer } from "@repo/db/indexer/schema";
import type { PublicObjekt } from "@repo/lib/objekts/types";
import type { ServerWebSocket } from "bun";

import { mapPublicObjekt } from "@repo/lib/objekts/utils";

import { redisPubSub } from "./lib/redis";
import { fetchKnownAddresses } from "./lib/user";

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
  objekt: PublicObjekt;
};

void redisPubSub.subscribe("transfers");

redisPubSub.on("message", async (channel, message) => {
  if (channel === "transfers") {
    const transfers = JSON.parse(message) as TransferData[];

    // fetch known address
    const addresses = transfers.flatMap((a) => [a.from, a.to]);
    const knownAddresses = await fetchKnownAddresses(addresses);

    const transferBatch: TransferSendData[] = [];

    for (const transfer of transfers) {
      const { objekt, collection, ...rest } = transfer;
      const fromUser = knownAddresses.find(
        (a) => a.address.toLowerCase() === transfer.from.toLowerCase(),
      );
      const toUser = knownAddresses.find(
        (a) => a.address.toLowerCase() === transfer.to.toLowerCase(),
      );

      const transferEvent = {
        nickname: {
          from: fromUser?.nickname ?? undefined,
          to: toUser?.nickname ?? undefined,
        },
        transfer: rest,
        objekt: mapPublicObjekt(objekt, collection),
      } satisfies TransferSendData;

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

const server = Bun.serve({
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

console.log(`Server is running on http://localhost:${server.port}`);
