import { RedisClient, type ServerWebSocket } from "bun";

import { websocketHandlers as activityHandlers } from "./activity";
import { serverEnv } from "./env";
import {
  NOTIFY_PREFIX,
  notifyChannel,
  type UserSocketMessage,
  userSocketMessageSchema,
} from "./schemas/notification";
import { auth } from "./services/auth";
import { redis } from "./services/redis";

export type SocketData = { kind: "activity" } | { kind: "user"; userId: string };
type UserSocket = ServerWebSocket<Extract<SocketData, { kind: "user" }>>;

// a subscribed client can run no other command, so publishing goes through `redis`
const subscriber = new RedisClient(serverEnv.REDIS_URL, { connectionTimeout: 5000 });

const sockets = new Map<string, Set<UserSocket>>();
const CHANGED = JSON.stringify({ type: "notifications_changed" } satisfies UserSocketMessage);
// never relayed: it tells every process to close the user's sockets
const REVOKED = "session_revoked";
/** The close code a tab sees when its account's sessions were revoked, as on a ban. */
export const SESSION_REVOKED_CLOSE_CODE = 4001;
const siteOrigin = new URL(serverEnv.SITE_URL).origin;

function logError(action: string) {
  return (error: unknown) => {
    console.error(
      `[UserWS] Failed to ${action}:`,
      error instanceof Error ? error.message : String(error),
    );
  };
}

// the worker publishes a bare "1", which means notifications changed
function toFrame(message: string) {
  try {
    const parsed = userSocketMessageSchema.safeParse(JSON.parse(message));
    if (parsed.success) return JSON.stringify(parsed.data);
  } catch {}
  return CHANGED;
}

function relay(message: string, channel: string) {
  const userId = channel.slice(NOTIFY_PREFIX.length);
  if (message === REVOKED) {
    for (const ws of sockets.get(userId) ?? []) ws.close(SESSION_REVOKED_CLOSE_CODE, REVOKED);
    return;
  }
  const frame = toFrame(message);
  for (const ws of sockets.get(userId) ?? []) {
    if (ws.readyState === WebSocket.OPEN) ws.send(frame);
  }
}

/** Tells the user's open tabs to refetch, through Valkey so a socket in any process hears it. */
export async function publishNotify(
  userId: string,
  message: UserSocketMessage = { type: "notifications_changed" },
) {
  await redis.publish(notifyChannel(userId), JSON.stringify(message)).catch(logError("publish"));
}

/** Closes the user's open sockets in every process, after their sessions were deleted. */
export async function publishSessionRevoked(userId: string) {
  await redis.publish(notifyChannel(userId), REVOKED).catch(logError("publish"));
}

export async function authorizeUserSocket(req: Request): Promise<string | Response> {
  if (req.headers.get("origin") !== siteOrigin) {
    return new Response("Forbidden", { status: 403 });
  }
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  return session.user.id;
}

// channels are subscribed per user while they have a socket open: Bun's client has no pattern subscribe
const userHandlers = {
  open(ws: UserSocket) {
    const { userId } = ws.data;
    let set = sockets.get(userId);
    if (!set) {
      set = new Set();
      sockets.set(userId, set);
      subscriber.subscribe(notifyChannel(userId), relay).catch((error: unknown) => {
        logError("subscribe")(error);
        // a socket that can hear nothing is closed, so the tab polls until it reconnects
        for (const socket of sockets.get(userId) ?? []) socket.close(1011);
      });
    }
    set.add(ws);
  },
  close(ws: UserSocket) {
    const { userId } = ws.data;
    const set = sockets.get(userId);
    if (!set) return;
    set.delete(ws);
    if (set.size > 0) return;
    sockets.delete(userId);
    subscriber.unsubscribe(notifyChannel(userId), relay).catch(logError("unsubscribe"));
  },
};

const isUser = (ws: ServerWebSocket<SocketData>): ws is UserSocket => ws.data.kind === "user";

/** Bun takes one set of handlers per server, so `/ws` and `/ws/me` share it by `ws.data.kind`. */
export const socketHandlers = {
  open(ws: ServerWebSocket<SocketData>) {
    if (isUser(ws)) userHandlers.open(ws);
    else activityHandlers.open(ws);
  },
  message(ws: ServerWebSocket<SocketData>, message: string | Buffer) {
    if (!isUser(ws)) activityHandlers.message(ws, message);
  },
  close(ws: ServerWebSocket<SocketData>) {
    if (isUser(ws)) userHandlers.close(ws);
    else activityHandlers.close(ws);
  },
};

export function closeUserSockets() {
  for (const set of sockets.values()) {
    for (const ws of set) ws.close();
  }
  sockets.clear();
}
