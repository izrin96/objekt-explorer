import { startActivityWebSocket } from "@repo/api/activity";
import { authorizeUserSocket, type SocketData, socketHandlers } from "@repo/api/user-socket";
import { serve } from "bun";

void startActivityWebSocket();

serve<SocketData>({
  port: 3001,
  async fetch(req, server) {
    if (new URL(req.url).pathname === "/ws/me") {
      const userId = await authorizeUserSocket(req);
      if (userId instanceof Response) return userId;
      if (server.upgrade(req, { data: { kind: "user", userId } })) return undefined;
      return new Response("Upgrade failed", { status: 500 });
    }
    if (server.upgrade(req, { data: { kind: "activity" } })) return undefined;
    return new Response("Not found", { status: 404 });
  },
  websocket: socketHandlers,
});

console.info("[dev:ws] Activity WebSocket listening on ws://localhost:3001/ws");
console.info("[dev:ws] User WebSocket listening on ws://localhost:3001/ws/me");
