import { serve } from "bun";

import {
  startActivityWebSocket,
  websocketHandlers,
} from "./src/lib/server/activity-websocket.server";

void startActivityWebSocket();

serve({
  port: 3001,
  fetch(req, server) {
    if (server.upgrade(req)) return undefined;
    return new Response("Not found", { status: 404 });
  },
  websocket: websocketHandlers,
});

console.info("[dev:ws] Activity WebSocket listening on ws://localhost:3001/ws");
