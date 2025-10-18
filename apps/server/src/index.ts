import "dotenv/config";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import type { Collection, Objekt, Transfer } from "@objekt-explorer/db/indexer/schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { redis, redisPubSub } from "./lib/redis";
import { fetchKnownAddresses } from "./lib/utils";

const TRANSFER_HISTORY_KEY = "transfer:history";

const clients = new Set<WSContext<WebSocket>>();
const app = new Hono();
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

type TransferData = Transfer & {
  collection: Collection;
  objekt: Objekt;
};

redisPubSub.subscribe("transfers").then(() => {
  redisPubSub.on("message", async (channel, message) => {
    if (channel === "transfers") {
      const transfers = JSON.parse(message) as TransferData[];

      // fetch known address
      const addresses = transfers.flatMap((a) => [a.from, a.to]);
      const knownAddresses = await fetchKnownAddresses(addresses);

      const transferBatch: any[] = [];

      for (const transfer of transfers) {
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
          transfer: {
            id: transfer.id,
            from: transfer.from,
            to: transfer.to,
            timestamp: transfer.timestamp,
            tokenId: transfer.tokenId,
            hash: transfer.hash,
          },
          objekt: {
            artist: transfer.collection.artist,
            backImage: transfer.collection.backImage,
            class: transfer.collection.class,
            collectionId: transfer.collection.collectionId,
            collectionNo: transfer.collection.collectionNo,
            frontImage: transfer.collection.frontImage,
            id: transfer.objekt.id,
            member: transfer.collection.member,
            onOffline: transfer.collection.onOffline,
            receivedAt: transfer.objekt.receivedAt,
            season: transfer.collection.season,
            serial: transfer.objekt.serial,
            slug: transfer.collection.slug,
            transferable: transfer.objekt.transferable,
          },
        };

        transferBatch.push(transferEvent);
      }

      // store history
      await redis.lpush(TRANSFER_HISTORY_KEY, ...transferBatch.map((a) => JSON.stringify(a)));
      await redis.ltrim(TRANSFER_HISTORY_KEY, 0, 50);

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
});

app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get(
  "/ws",
  upgradeWebSocket(() => {
    return {
      async onMessage(event, ws) {
        if (event.type === "request_history") {
          const history = await redis.lrange(TRANSFER_HISTORY_KEY, 0, -1);
          if (history.length > 0) {
            const parsed = history.map((item) => JSON.parse(item));

            const msg = {
              type: "history",
              data: parsed,
            };
            ws.send(JSON.stringify(msg));
          }
        }
      },
      onOpen(_, ws) {
        clients.add(ws);
      },
      onClose(_, ws) {
        clients.delete(ws);
      },
    };
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

const server = serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
injectWebSocket(server);
