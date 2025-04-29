import { Transfer } from "./lib/server/db/indexer/schema";
import { fetchKnownAddresses } from "./lib/server/profile";

const server = Bun.serve({
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) {
      // Bun automatically returns a 101 Switching Protocols
      // if the upgrade succeeds
      return undefined;
    }

    // handle HTTP request normally
    return new Response("Hello world!");
  },
  websocket: {
    open(ws) {
      ws.subscribe("transfer");
    },
    async message(ws, message) {
      ws.send(`You said: ${message}`);
    },
    close(ws) {
      ws.unsubscribe("transfer");
    },
  },
  routes: {
    "/send": {
      POST: handleSend,
    },
  },
});

async function handleSend(req: Request): Promise<Response> {
  try {
    const payload = (await req.json()) as Transfer;
    const nicknames = await fetchKnownAddresses([payload.from, payload.to]);

    const message = JSON.stringify({
      type: "transfer",
      data: {
        ...payload,
        nicknames,
      },
    });

    server.publish("transfer", message);

    return Response.json({ status: "success" });
  } catch (err) {
    console.error("Error in /send:", err);
    return new Response("Invalid request", { status: 400 });
  }
}

console.log(`Listening on ${server.hostname}:${server.port}`);
