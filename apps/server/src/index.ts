import "dotenv/config";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import type { Collection, Objekt, Transfer } from "@objekt-explorer/db/indexer/schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { mapOwnedObjekt } from "./lib/objekt";
import { redisPubSub } from "./lib/redis";
import type { OwnedObjekt } from "./lib/universal/objekts";
import { fetchKnownAddresses } from "./lib/utils";

const clients = new Set<WSContext>();
const app = new Hono();
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

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

redisPubSub.subscribe("transfers");

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
        objekt: mapOwnedObjekt(objekt, collection),
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
        const data = JSON.parse(event.data) as { type: string; data?: any };
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
