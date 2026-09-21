import { startActivityWebSocket, websocketHandlers } from "@repo/api/activity";
import { serve } from "bun";

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
