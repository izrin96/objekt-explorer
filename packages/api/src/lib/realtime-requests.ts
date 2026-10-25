import type { ActivityItem } from "../schemas/activity";
import {
  ACTIVITY_CHANNEL,
  type RealtimeEvent,
  SESSION_REVOKED_CODE,
  SESSION_REVOKED_REASON,
  userChannel,
} from "../schemas/realtime";
import { unique } from "./unique";

/** One call to Centrifugo's HTTP API: the path under its base URL and the JSON body. */
export type ApiRequest = { path: string; body: unknown };

type UserEvent = { userId: string; event: RealtimeEvent };

/**
 * Centrifugo drops a repeated key on the same channel for 5 minutes, so the retry of a
 * request delivers once. A batch can put several publications on one channel, so each
 * command's key carries its index.
 */
const publish = (channel: string, data: unknown, key: string) => ({
  publish: { channel, data, idempotency_key: key },
});

export function publishRequest(userId: string, event: RealtimeEvent): ApiRequest {
  return {
    path: "/api/publish",
    body: {
      channel: userChannel(userId),
      data: event,
      idempotency_key: crypto.randomUUID(),
    },
  };
}

/** One event to many users; each channel keeps its own history. */
export function broadcastRequest(userIds: string[], event: RealtimeEvent): ApiRequest {
  return {
    path: "/api/broadcast",
    body: {
      channels: unique(userIds).map(userChannel),
      data: event,
      idempotency_key: crypto.randomUUID(),
    },
  };
}

/** Events that differ per user, sent in one call and applied in order. */
export function batchRequest(items: UserEvent[]): ApiRequest {
  const id = crypto.randomUUID();
  return {
    path: "/api/batch",
    body: {
      commands: items.map(({ userId, event }, index) =>
        publish(userChannel(userId), event, `${id}:${index}`),
      ),
    },
  };
}

/** One publication per row, so the channel's history of 50 is the last 50 rows. */
export function activityRequest(items: ActivityItem[]): ApiRequest {
  const id = crypto.randomUUID();
  return {
    path: "/api/batch",
    body: {
      commands: items.map((item, index) => publish(ACTIVITY_CHANNEL, item, `${id}:${index}`)),
    },
  };
}

export function disconnectRequest(userId: string): ApiRequest {
  return {
    path: "/api/disconnect",
    body: {
      user: userId,
      disconnect: { code: SESSION_REVOKED_CODE, reason: SESSION_REVOKED_REASON },
    },
  };
}

type ApiError = { code?: number; message?: string };

/**
 * The API answers 200 with an `error` for a refused call, in the body or, for a batch, in
 * any of its replies; returns the first one, or null when every command went through.
 */
export function firstApiError(response: unknown): ApiError | null {
  if (typeof response !== "object" || response === null) return null;
  const { error, replies } = response as { error?: ApiError; replies?: { error?: ApiError }[] };
  if (error) return error;
  return replies?.find((reply) => reply.error)?.error ?? null;
}
