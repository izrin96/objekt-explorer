import "dotenv/config";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import type { Collection, Objekt, Transfer } from "@objekt-explorer/db/indexer/schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { mapOwnedObjekt } from "./lib/objekt";
import { redis, redisPubSub } from "./lib/redis";
import type { OwnedObjekt } from "./lib/universal/objekts";
import { fetchKnownAddresses } from "./lib/utils";

const TRANSFER_HISTORY_KEY = "transfer:history";

const clients = new Set<WSContext>();
const app = new Hono();
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

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
